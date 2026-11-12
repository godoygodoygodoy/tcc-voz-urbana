import jwt from 'jsonwebtoken';
// These tickets grant access to one image only. Authorization is rechecked on every read.
export const publicationImages = (images = [], req) => images.map(image => ({
  ...image,
  url: `/api/media/${encodeURIComponent(image.id)}?access=${encodeURIComponent(jwt.sign({ imageId: image.id, viewerId: req.userId || null }, process.env.JWT_SECRET, { expiresIn: '2h', audience: 'publication-image' }))}`,
}));
