
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shift } from '../types';

interface RouteMapProps {
  shifts: Shift[];
}

const RecenterMap = ({ shifts }: RouteMapProps) => {
  const map = useMap();
  useMemo(() => {
    const points: [number, number][] = [];
    shifts.forEach(s => {
      if (s.startLat && s.startLng) points.push([s.startLat, s.startLng]);
      if (s.endLat && s.endLng) points.push([s.endLat, s.endLng]);
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [shifts, map]);
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ shifts }) => {
  const routePoints = useMemo(() => {
    const points: [number, number][] = [];
    // Сортируем по времени для правильной отрисовки линии
    const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
    sorted.forEach(s => {
      if (s.startLat && s.startLng) points.push([s.startLat, s.startLng]);
      if (s.endLat && s.endLng) points.push([s.endLat, s.endLng]);
    });
    return points;
  }, [shifts]);

  const markers = useMemo(() => {
    return shifts.filter(s => (s.startLat && s.startLng) || (s.endLat && s.endLng));
  }, [shifts]);

  return (
    <div className="liquid-glass rounded-[3rem] overflow-hidden h-[500px] w-full border border-white/60 shadow-2xl relative z-10 animate-in fade-in duration-700">
      <MapContainer 
        center={[52.237, 21.012]} 
        zoom={5} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        <Polyline 
          positions={routePoints} 
          pathOptions={{ 
            color: '#10b981', 
            weight: 4, 
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round'
          }} 
        />

        {markers.map((s) => (
          <React.Fragment key={s.id}>
            {s.startLat && s.startLng && (
              <CircleMarker 
                center={[s.startLat, s.startLng]} 
                radius={8}
                pathOptions={{ 
                  fillColor: '#10b981', 
                  color: '#fff', 
                  weight: 2, 
                  fillOpacity: 0.8 
                }}
              >
                <Popup>
                  <div className="text-xs font-bold font-sans">
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] mb-1">Старт смены</p>
                    <p>{s.date} в {s.startTime}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}
            {s.endLat && s.endLng && (
              <CircleMarker 
                center={[s.endLat, s.endLng]} 
                radius={8}
                pathOptions={{ 
                  fillColor: '#3b82f6', 
                  color: '#fff', 
                  weight: 2, 
                  fillOpacity: 0.8 
                }}
              >
                <Popup>
                  <div className="text-xs font-bold font-sans">
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] mb-1">Финиш смены</p>
                    <p>{s.date} в {s.endTime}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}
          </React.Fragment>
        ))}

        <RecenterMap shifts={shifts} />
      </MapContainer>
    </div>
  );
};

export default React.memo(RouteMap);
