import express from 'express';
import { uploadsRoot } from './uploads.js';

// Use the same directory for writing and serving uploaded images.
export const uploadedMedia = express.Router();
uploadedMedia.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsRoot));
