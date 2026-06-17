import React, { useMemo, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';

const containerStyle = (height) => ({ width: '100%', height });

const toPoint = (problem) => {
  const lat = Number(problem.latitude);
  const lng = Number(problem.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

const MapGoogle = ({ problems = [], onMarkerClick, height = '500px', className = '' }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });
  const [active, setActive] = useState(null);
  const points = useMemo(
    () => problems.map((p) => ({ problem: p, point: toPoint(p) })).filter((x) => x.point !== null),
    [problems]
  );
  const center = useMemo(() => {
    if (points.length === 0) return { lat: -15.8267, lng: -47.8822 };

    const avgLat = points.reduce((s, x) => s + x.point.lat, 0) / points.length;
    const avgLng = points.reduce((s, x) => s + x.point.lng, 0) / points.length;

    return { lat: avgLat, lng: avgLng };
  }, [points]);

  if (!apiKey) {
    return (
      <div className={`p-4 bg-yellow-50 text-yellow-800 rounded ${className}`}>Chave do Google Maps não encontrada. Defina `REACT_APP_GOOGLE_MAPS_KEY`.</div>
    );
  }

  if (loadError) return <div className={className}>Erro ao carregar Google Maps</div>;
  if (!isLoaded) return <div className={className}>Carregando mapa...</div>;

  return (
    <div className={className}>
      <GoogleMap mapContainerStyle={containerStyle(height)} center={center} zoom={13}>
        {points.map(({ problem, point }) => (
          <Marker
            key={problem.id}
            position={point}
            onClick={() => {
              setActive(problem);
              onMarkerClick?.(problem);
            }}
          />
        ))}

        {active && (
          <InfoWindow
            position={toPoint(active)}
            onCloseClick={() => setActive(null)}
          >
            <div style={{ maxWidth: 220 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>{active.title}</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: 12 }}>{active.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapGoogle;
