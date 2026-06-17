import React, { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPurpleTone } from '../utils/theme';
import MapGoogle from './MapGoogle';

// Corrigir ícone do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

const createMarkerIcon = (color = '#7C3AED') => L.divIcon({
  className: 'urban-marker',
  html: `
    <span
      class="urban-marker__dot"
      style="--marker-color:${color};"
    ></span>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -24],
});

const formatAreaLabel = (points) => {
  if (!points || points.length < 3) {
    return 'Clique em pelo menos 3 pontos para fechar a área.';
  }

  return `Área em desenho com ${points.length} pontos.`;
};

const toPoint = (problem) => {
  const latitude = Number(problem.latitude);
  const longitude = Number(problem.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }
  return [latitude, longitude];
};

const FitBounds = ({ problems }) => {
  const map = useMap();

  useEffect(() => {
    const points = problems.map(toPoint).filter(Boolean);

    if (points.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!map || !map._container || !document.body.contains(map._container)) {
        return;
      }

      map.invalidateSize();

      if (points.length === 1) {
        map.setView(points[0], 15, { animate: false });
        return;
      }

      map.fitBounds(points, { padding: [40, 40], maxZoom: 16, animate: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [map, problems]);

  return null;
};

const AreaDrawingLayer = ({ active, selectedArea, onAreaComplete, onAreaDrawingToggle }) => {
  const map = useMap();
  const [draftPoints, setDraftPoints] = useState([]);

  useEffect(() => {
    if (!active) {
      setDraftPoints([]);
    }

    if (active) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [active, map]);

  useMapEvents({
    click: (event) => {
      if (!active) {
        return;
      }

      const nextPoint = [event.latlng.lat, event.latlng.lng];
      setDraftPoints((currentPoints) => [...currentPoints, nextPoint]);
    },
  });

  const finishDrawing = () => {
    if (draftPoints.length >= 3) {
      onAreaComplete?.(draftPoints);
      setDraftPoints([]);
      onAreaDrawingToggle?.(false);
    }
  };

  const clearDrawing = () => {
    setDraftPoints([]);
    onAreaComplete?.(null);
  };

  const visibleArea = active ? draftPoints : selectedArea;

  return (
    <>
      {visibleArea?.length >= 2 && (
        <Polyline
          positions={visibleArea}
          pathOptions={{ color: '#A855F7', weight: 3, dashArray: '10 10', opacity: 0.95 }}
        />
      )}

      {visibleArea?.length >= 3 && (
        <Polygon
          positions={visibleArea}
          pathOptions={{ color: '#C084FC', fillColor: '#7C3AED', fillOpacity: 0.22, weight: 2 }}
        />
      )}

      {visibleArea?.map((point, index) => (
        <CircleMarker
          key={`${point[0]}-${point[1]}-${index}`}
          center={point}
          radius={6}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#A855F7', fillOpacity: 1 }}
        />
      ))}

      {active && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex flex-col gap-3 sm:inset-x-auto sm:left-4 sm:w-[300px]">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-zinc-950/90 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">Selecionar área</p>
                <p className="mt-1 text-sm text-white/70">{formatAreaLabel(draftPoints)}</p>
              </div>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200">
                Desenho
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={finishDrawing}
                disabled={draftPoints.length < 3}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Finalizar área
              </button>
              <button
                type="button"
                onClick={clearDrawing}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-bold text-white"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Map = ({
  problems = [],
  onMarkerClick,
  height = '500px',
  className = '',
  selectedArea = null,
  areaDrawingActive = false,
  onAreaComplete,
  onAreaDrawingToggle,
}) => {
  const useGoogle = Boolean(process.env.REACT_APP_GOOGLE_MAPS_KEY);

  if (useGoogle) {
    return (
      <MapGoogle
        problems={problems}
        onMarkerClick={onMarkerClick}
        height={height}
        className={className}
      />
    );
  }
  const validProblems = problems.filter((problem) => toPoint(problem));

  return (
    <div className={`relative ${className}`.trim()}>
      <MapContainer
        center={[-15.8267, -47.8822]}
        zoom={12}
        className="urban-map"
        style={{ height, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <FitBounds problems={validProblems} />
        <AreaDrawingLayer
          active={areaDrawingActive}
          selectedArea={selectedArea}
          onAreaComplete={onAreaComplete}
          onAreaDrawingToggle={onAreaDrawingToggle}
        />
        {validProblems.map((problem) => {
          const point = toPoint(problem);
          const markerColor = getPurpleTone(problem.category?.name || problem.category?.id || problem.id);

          return (
            <Marker
              key={problem.id}
              position={point}
              icon={createMarkerIcon(markerColor)}
              eventHandlers={{
                click: () => onMarkerClick?.(problem),
              }}
            >
              <Popup>
                <div className="w-56">
                  <h3 className="font-bold text-sm text-zinc-900">{problem.title}</h3>
                  <p className="text-xs text-zinc-600 mt-1 line-clamp-3">{problem.description}</p>
                  <p className="text-xs mt-3">
                    <span
                      className="px-2 py-1 rounded text-white text-xs font-semibold"
                      style={{ backgroundColor: markerColor }}
                    >
                      {problem.category?.name || 'Sem categoria'}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {validProblems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm rounded-3xl">
          <div className="text-center px-6 py-4">
            <p className="font-semibold text-white">Nenhum ponto disponível no mapa</p>
            <p className="text-sm text-white/70 mt-1">Cadastre um problema para ver os marcadores aqui.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
