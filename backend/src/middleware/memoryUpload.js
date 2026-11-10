import multer from "multer";

export const imageMimetypeExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

const imageFilter = (req, file, callback) => {
  if (imageMimetypeExtensions[file.mimetype]) return callback(null, true);
  return callback(Object.assign(new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF."), { status: 400 }));
};

export const memoryImageUpload = (options = {}) => multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024),
    ...options.limits
  },
  fileFilter: imageFilter
});
