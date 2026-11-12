import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { uploadsRoot } from "./uploads.js";

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

const supabaseUrl = process.env.SUPABASE_URL?.trim()
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
export const supabaseStorageEnabled = process.env.SUPABASE_STORAGE_ENABLED !== "false"
  && Boolean(supabaseUrl && supabaseServiceRoleKey);
const supabase = supabaseStorageEnabled
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const bucketNames = new Set(["avatars", "posts", "reports"]);
const bucketReady = new Set();

const getBucket = (bucket) => {
  if (!bucketNames.has(bucket)) throw new Error("Bucket de armazenamento inválido.");
  return bucket;
};

const ensureBucket = async (bucket) => {
  if (!supabase || bucketReady.has(bucket)) return;
  const { error } = await supabase.storage.createBucket(bucket, {
    public: bucket === "avatars" && process.env.SUPABASE_STORAGE_PUBLIC !== "false",
    fileSizeLimit: `${Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024)}`
  });
  if (error && !/already exists|duplicate/i.test(error.message || "")) {
    throw new Error(`Não foi possível preparar o bucket ${bucket}: ${error.message}`);
  }
  if (bucket !== 'avatars') {
    const { error: privacyError } = await supabase.storage.updateBucket(bucket, { public: false });
    if (privacyError) throw Object.assign(new Error('Publication storage must be private.'), { code: 'STORAGE_PRIVACY_REQUIRED' });
  }
  bucketReady.add(bucket);
};

const getExtension = (file) => MIME_EXTENSIONS[file.mimetype];

const parseSupabaseObjectUrl = (url) => {
  if (!supabase || !url?.startsWith(supabaseUrl)) return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: getBucket(match[1]), path: decodeURIComponent(match[2]) };
};

export const validateImageFile = (file) => {
  if (!file || !MIME_EXTENSIONS[file.mimetype]) {
    throw Object.assign(new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF."), { status: 400 });
  }
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw Object.assign(new Error("Arquivo de imagem vazio ou inválido."), { status: 400 });
  }
};

export const storeFile = async (file, bucket, ownerId) => {
  validateImageFile(file);
  const safeBucket = getBucket(bucket);
  const extension = getExtension(file);
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const objectPath = `${ownerId}/${filename}`;

  if (supabase) {
    await ensureBucket(safeBucket);
    const { error } = await supabase.storage.from(safeBucket).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "31536000",
      upsert: false
    });
    if (error) throw new Error(`Falha ao enviar imagem para o Supabase: ${error.message}`);
    const { data } = supabase.storage.from(safeBucket).getPublicUrl(objectPath);
    return { url: data.publicUrl, bucket: safeBucket, path: objectPath };
  }

  const directory = path.join(uploadsRoot, safeBucket, String(ownerId));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), file.buffer);
  return { url: `/uploads/${safeBucket}/${ownerId}/${filename}`, bucket: safeBucket, path: objectPath };
};

export const storeFiles = async (files, bucket, ownerId) => {
  const stored = [];
  try {
    for (const file of files || []) stored.push(await storeFile(file, bucket, ownerId));
    return stored;
  } catch (error) {
    await removeStoredFiles(stored.map((item) => item.url)).catch((cleanupError) => {
      console.error("Falha ao limpar imagens após falha de upload:", cleanupError.message);
    });
    throw error;
  }
};

export const removeStoredFile = async (url) => {
  if (!url) return;
  const object = parseSupabaseObjectUrl(url);
  if (object) {
    const { error } = await supabase.storage.from(object.bucket).remove([object.path]);
    if (error) throw new Error(`Falha ao remover imagem do Supabase: ${error.message}`);
    return;
  }

  if (url.startsWith("/uploads/")) {
    const relativePath = url.slice("/uploads/".length);
    const resolved = path.resolve(uploadsRoot, relativePath);
    const root = path.resolve(uploadsRoot);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Caminho de arquivo inválido.");
    await fs.unlink(resolved).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
};

export const createTemporaryUrl = async (url, expiresIn = 3600) => {
  const object = parseSupabaseObjectUrl(url);
  if (!object || !supabase) return url;
  const { data, error } = await supabase.storage.from(object.bucket).createSignedUrl(object.path, expiresIn);
  if (error) throw new Error(`Falha ao criar URL temporária: ${error.message}`);
  return data.signedUrl;
};

export const listStoredFiles = async (bucket, prefix = "") => {
  if (!supabase) return [];
  await ensureBucket(getBucket(bucket));
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw new Error(`Falha ao consultar arquivos do Supabase: ${error.message}`);
  return data;
};

export const removeStoredFiles = async (urls) => {
  await Promise.all((urls || []).filter(Boolean).map(removeStoredFile));
};

export const getStorageInfo = () => ({
  provider: supabaseStorageEnabled ? "supabase" : "local",
  buckets: [...bucketNames]
});

// Run before accepting HTTP requests; existing public storage URLs must stop bypassing privacy.
export const securePublicationStorage = async () => {
  if (supabase) { await ensureBucket('posts'); await ensureBucket('reports'); }
};
export const readStoredPublication = async (url) => {
  const object = parseSupabaseObjectUrl(url);
  if (object && supabase && ['posts', 'reports'].includes(object.bucket)) {
    const { data, error } = await supabase.storage.from(object.bucket).download(object.path);
    if (error || !data) throw Object.assign(new Error('Image unavailable'), { status: 404 });
    return { buffer: Buffer.from(await data.arrayBuffer()), contentType: data.type || 'application/octet-stream' };
  }
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) throw Object.assign(new Error('Image unavailable'), { status: 404 });
  const root = path.resolve(uploadsRoot);
  const target = path.resolve(root, url.slice('/uploads/'.length));
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !['reports', 'posts'].includes(relative.split(path.sep)[0])) throw Object.assign(new Error('Image unavailable'), { status: 404 });
  const contentType = Object.entries(MIME_EXTENSIONS).find(([, extension]) => extension === path.extname(target).toLowerCase())?.[0];
  if (!contentType) throw Object.assign(new Error('Image unavailable'), { status: 404 });
  try { return { buffer: await fs.readFile(target), contentType }; }
  catch { throw Object.assign(new Error('Image unavailable'), { status: 404 }); }
};
