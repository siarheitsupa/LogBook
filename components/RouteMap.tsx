import React, { useMemo } from 'react';
// @ts-ignore - react-leaflet 5 alpha types are often incomplete in build environments
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shift } from '../types';

interface RouteMapProps {
  shifts: Shift[];
}

/**
 * Вспомогательный компонент для управления границами карты.
 */
const RecenterMap = ({ shifts }: RouteMapProps) => {
  const map = useMap();
  useMemo(() => {
    const points: L.LatLngExpression[] = [];
    shifts.forEach(s => {
      if (s.startLat && s.startLng) points.push([s.startLat, s.startLng]);
      if (s.endLat && s.endLng) points.push([s.endLat, s.endLng]);
    });
    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn('Map bounds fitting failed', e);
      }
    }
  }, [shifts, map]);
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ shifts }) => {
  const routePoints = useMemo(() => {
    const points: L.LatLngExpression[] = [];
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
          // @ts-ignore
          color="#10b981"
          weight={4}
          opacity={0.6}
        />

        <RecenterMap shifts={shifts} />

        {markers.map((s) => (
          <React.Fragment key={s.id}>
            {s.startLat && s.startLng && (
              <CircleMarker 
                center={[s.startLat, s.startLng]} 
                radius={8}
                // @ts-ignore
                fillColor="#10b981"
                color="#fff"
                weight={2}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-xs font-bold font-sans p-1">
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] mb-1">Старт</p>
                    <p className="text-slate-900">{s.date} {s.startTime}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}
            {s.endLat && s.endLng && (
              <CircleMarker 
                center={[s.endLat, s.endLng]} 
                radius={8}
                // @ts-ignore
                fillColor="#f43f5e"
                color="#fff"
                weight={2}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-xs font-bold font-sans p-1">
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] mb-1">Финиш</p>
                    <p className="text-slate-900">{s.date} {s.endTime}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default RouteMap;