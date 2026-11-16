import jwt from 'jsonwebtoken';
// These tickets grant access to one image only. Authorization is rechecked on every read.
export const publicationImages = (images = [], req, {responsive=false}={}) => images.map(image => {
  const url=`/api/media/${encodeURIComponent(image.id)}?access=${encodeURIComponent(jwt.sign({ imageId: image.id, viewerId: req.userId || null, iat: Math.floor(Date.now()/300000)*300 }, process.env.JWT_SECRET, { expiresIn: '2h', audience: 'publication-image' }))}`;
  return {
  ...image,
  // Stable within five-minute windows: polling unchanged posts should not
  // download the same image again. Every read still rechecks current access.
  url,
  ...(responsive?{variants:[480,960,1440].map(width=>({width,url:url+'&width='+width+'&format=webp'}))}:{}),
};});
