export function drawStoryBase({
  canvas,
  drawing,
  media,
  video,
  layout,
  zoom,
  background,
  strokes
}) {
  if (!canvas) return;
  const W = 1080,
    H = 1920,
    c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  c.fillStyle = background;
  c.fillRect(0, 0, W, H);
  const items = video ? video.readyState >= 2 ? [{
    image: video
  }] : [] : media;
  items.forEach((item, index) => {
    const image = item.image;
    if (!image) return;
    const width = image.videoWidth || image.naturalWidth || image.width,
      height = image.videoHeight || image.naturalHeight || image.height;
    if (!width || !height) return;
    const columns = layout === 'grid' ? 2 : 1,
      rows = layout === 'single' ? 1 : layout === 'strip' ? items.length : Math.ceil(items.length / columns),
      cw = W / columns,
      ch = H / rows,
      x = layout === 'single' ? 0 : index % columns * cw,
      y = layout === 'single' ? 0 : Math.floor(index / columns) * ch;
    c.save();
    c.beginPath();
    c.rect(x, y, cw, ch);
    c.clip();
    const ratio = (layout === 'single' ? Math.min(cw / width, ch / height) : Math.max(cw / width, ch / height)) * zoom;
    c.drawImage(image, x + (cw - width * ratio) / 2, y + (ch - height * ratio) / 2, width * ratio, height * ratio);
    c.restore();
  });
  if (!drawing.current) {
    drawing.current = document.createElement('canvas');
    drawing.current.width = W;
    drawing.current.height = H;
  }
  const ink = drawing.current.getContext('2d');
  ink.clearRect(0, 0, W, H);
  // Erasing affects ink only, never destroys the original photo underneath.
  strokes.forEach(stroke => {
    ink.save();
    ink.globalAlpha = stroke.opacity ?? 1;
    ink.globalCompositeOperation = stroke.kind === 'eraser' ? 'destination-out' : 'source-over';
    ink.beginPath();
    ink.strokeStyle = stroke.color;
    ink.lineWidth = stroke.size;
    ink.lineCap = 'round';
    ink.lineJoin = 'round';
    stroke.points.forEach(([x, y], i) => i ? ink.lineTo(x, y) : ink.moveTo(x, y));
    if (stroke.points.length === 1) ink.lineTo(stroke.points[0][0] + .1, stroke.points[0][1] + .1);
    ink.stroke();
    ink.restore();
  });
  c.drawImage(drawing.current, 0, 0);
}
