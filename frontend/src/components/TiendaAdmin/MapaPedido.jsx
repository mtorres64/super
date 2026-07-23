import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinSvg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 21.875 12.5 41 12.5 41C12.5 41 25 21.875 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="${color}"/>
  <circle cx="12.5" cy="12.5" r="5" fill="white"/>
</svg>`;

const makeIcon = (color) => L.divIcon({
  className: '',
  html: pinSvg(color),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const blueIcon = makeIcon('#2563eb');
const redIcon  = makeIcon('#ef4444');

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [16, 16] });
    }
  }, [map, points]);
  return null;
}

export default function MapaPedido({ clienteLat, clienteLng, sucursalLat, sucursalLng }) {
  const [ruta, setRuta] = useState(null);

  const tieneSucursal = sucursalLat != null && sucursalLng != null;

  useEffect(() => {
    if (!tieneSucursal) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${sucursalLng},${sucursalLat};${clienteLng},${clienteLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (coords) setRuta(coords.map(([lng, lat]) => [lat, lng]));
      })
      .catch(() => {});
  }, [clienteLat, clienteLng, sucursalLat, sucursalLng, tieneSucursal]);

  const center = [clienteLat, clienteLng];
  const boundsPoints = [[clienteLat, clienteLng]];
  if (tieneSucursal) boundsPoints.push([sucursalLat, sucursalLng]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: 220, borderRadius: 10, minWidth: 0 }}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
      {ruta && (
        <Polyline
          positions={ruta}
          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
        />
      )}
      {tieneSucursal && <Marker position={[sucursalLat, sucursalLng]} icon={blueIcon} />}
      <Marker position={[clienteLat, clienteLng]} icon={redIcon} />
      {boundsPoints.length >= 2 && <FitBounds points={boundsPoints} />}
    </MapContainer>
  );
}
