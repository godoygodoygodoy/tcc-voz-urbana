import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { geographyAPI } from '../services/api';
import { useAuthStore } from '../store';

export default function HeatmapLayer({ filters, onState }) {
  const map = useMap(), userId = useAuthStore(state => state.user?.id);
  const report = useRef(onState); report.current = onState;
  useEffect(() => {
    if (!filters) return undefined;
    let stopped = false, timer, controller, frame, points = [];
    const canvas = document.createElement('canvas');
    canvas.className = 'urban-heatmap';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '400' });
    map.getContainer().appendChild(canvas);
    const stamp = document.createElement('canvas'); stamp.width = stamp.height = 72;
    const brush = stamp.getContext('2d');
    const gradient = brush.createRadialGradient(36, 36, 0, 36, 36, 36);
    gradient.addColorStop(0, 'rgba(253,164,175,0.95)');
    gradient.addColorStop(0.35, 'rgba(192,132,252,0.65)');
    gradient.addColorStop(1, 'rgba(124,58,237,0)');
    brush.fillStyle = gradient; brush.fillRect(0, 0, 72, 72);
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (stopped) return;
        const size = map.getSize();
        // One canvas pixel per CSS pixel keeps repaint work bounded on high-DPI devices.
        canvas.width = size.x; canvas.height = size.y;
        const context = canvas.getContext('2d');
        const maximum = Math.max(1, ...points.map(point => point.count));
        for (const point of points) {
          const pixel = map.latLngToContainerPoint([point.latitude, point.longitude]);
          if (pixel.x < -36 || pixel.y < -36 || pixel.x > size.x + 36 || pixel.y > size.y + 36) continue;
          context.globalAlpha = 0.25 + 0.75 * Math.sqrt(point.count / maximum);
          context.drawImage(stamp, pixel.x - 36, pixel.y - 36);
        }
        canvas.style.opacity = '1';
      });
    };
    const load = () => {
      clearTimeout(timer); controller?.abort();
      draw();
      timer = setTimeout(async () => {
        if (stopped || document.hidden) return;
        controller = new AbortController(); const request = controller;
        const bounds = map.getBounds();
        // World wrapping can exceed longitude bounds; querying the whole world is explicit.
        const west = Math.max(-180, bounds.getWest()), east = Math.min(180, bounds.getEast());
        report.current?.({ loading: true, error: false });
        try {
          const { data } = await geographyAPI.heatmap({ ...filters, south: Math.max(-90, bounds.getSouth()), north: Math.min(90, bounds.getNorth()),
            west: west < east ? west : -180, east: west < east ? east : 180 }, { signal: request.signal });
          if (!Array.isArray(data.points) || data.points.length > 2000 || data.points.some(point => ![point.latitude, point.longitude, point.count].every(Number.isFinite) || point.count < 1)) throw new Error('Invalid density');
          if (stopped || request.signal.aborted) return;
          points = data.points; draw(); report.current?.({ ...data, loading: false, error: false });
        } catch {
          if (!stopped && !request.signal.aborted) { points = []; draw(); report.current?.({ loading: false, error: true }); }
        }
      }, 250);
    };
    const hide = () => { canvas.style.opacity = '0'; };
    const visible = () => { if (!document.hidden) load(); else { clearTimeout(timer); controller?.abort(); } };
    map.on('movestart zoomstart', hide); map.on('moveend resize', load);
    document.addEventListener('visibilitychange', visible); load();
    return () => {
      stopped = true; clearTimeout(timer); controller?.abort(); cancelAnimationFrame(frame);
      map.off('movestart zoomstart', hide); map.off('moveend resize', load);
      document.removeEventListener('visibilitychange', visible); canvas.remove();
    };
  }, [map, filters, userId]);
  return null;
}
