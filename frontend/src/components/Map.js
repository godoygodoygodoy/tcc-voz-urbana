import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir ícone do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

const Map = ({ problems = [], onMarkerClick }) => {
  const mapRef = useRef(null);

  return (
    <MapContainer
      center={[-15.8267, -47.8822]} // Brasília
      zoom={12}
      style={{ height: '500px', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {problems.map((problem) => (
        <Marker
          key={problem.id}
          position={[problem.latitude, problem.longitude]}
          onClick={() => onMarkerClick?.(problem)}
        >
          <Popup>
            <div className="w-48">
              <h3 className="font-bold text-sm">{problem.title}</h3>
              <p className="text-xs text-gray-600 mt-1">{problem.description}</p>
              <p className="text-xs mt-2">
                <span className={`px-2 py-1 rounded text-white text-xs`}
                  style={{ backgroundColor: problem.category?.color }}>
                  {problem.category?.name}
                </span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
