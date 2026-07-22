import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Search, Loader2, MapPin } from 'lucide-react';

// Fix leaflet default marker icons (known CRA issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const PRIMARY = 'var(--primary, #10b981)';
const ARGENTINA = [-34.6037, -58.3816]; // Buenos Aires

function ClickHandler({ onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function RecenterMap({ position }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function reverseGeocode(lat, lng) {
  const r = await fetch(`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
  const d = await r.json();
  if (!d.address) return '';
  const a = d.address;
  const partes = [];
  if (a.road) partes.push(a.road + (a.house_number ? ` ${a.house_number}` : ''));
  if (a.suburb || a.neighbourhood) partes.push(a.suburb || a.neighbourhood);
  if (a.city || a.town || a.village || a.county) partes.push(a.city || a.town || a.village || a.county);
  return partes.length ? partes.join(', ') : d.display_name.split(',').slice(0, 2).join(',').trim();
}

async function forwardGeocode(query) {
  const r = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=es&countrycodes=ar`);
  return r.json();
}

const MapaPicker = ({ coordenadas, onCoordenadas, onDireccion }) => {
  const [pos, setPos] = useState(coordenadas ? [coordenadas.lat, coordenadas.lng] : null);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);

  const selectLocation = useCallback(async (lat, lng) => {
    const newPos = [lat, lng];
    setPos(newPos);
    onCoordenadas({ lat, lng });
    setSugerencias([]);
    setGeocoding(true);
    try {
      const dir = await reverseGeocode(lat, lng);
      if (dir) onDireccion(dir);
    } finally {
      setGeocoding(false);
    }
  }, [onCoordenadas, onDireccion]);

  const usarGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { selectLocation(coords.latitude, coords.longitude).finally(() => setGpsLoading(false)); },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const onQueryChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try { setSugerencias(await forwardGeocode(val)); } finally { setBuscando(false); }
    }, 600);
  };

  const elegirSugerencia = (s) => {
    setQuery(s.display_name.split(',').slice(0, 2).join(',').trim());
    setSugerencias([]);
    selectLocation(parseFloat(s.lat), parseFloat(s.lon));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Barra de búsqueda */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'visible', background: 'white' }}>
          <Search size={15} style={{ color: '#9ca3af', marginLeft: 10, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Buscar dirección en el mapa..."
            style={{ flex: 1, border: 'none', outline: 'none', padding: '0.55rem 0.75rem', fontSize: '0.85rem', background: 'transparent' }}
          />
          {buscando && <Loader2 size={15} style={{ color: '#9ca3af', marginRight: 10, animation: 'spin 1s linear infinite' }} />}
        </div>
        {sugerencias.length > 0 && (
          <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 9999, margin: '4px 0 0', padding: 0, listStyle: 'none', maxHeight: 220, overflowY: 'auto' }}>
            {sugerencias.map((s, i) => (
              <li key={i} onClick={() => elegirSugerencia(s)}
                style={{ padding: '0.55rem 0.85rem', cursor: 'pointer', fontSize: '0.82rem', color: '#374151', borderBottom: i < sugerencias.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb', position: 'relative', height: 260 }}>
        <MapContainer
          center={pos || ARGENTINA}
          zoom={pos ? 16 : 12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={selectLocation} />
          {pos && <RecenterMap position={pos} />}
          {pos && <Marker position={pos} />}
        </MapContainer>

        {/* Overlay "Tocá para marcar" si no hay pin */}
        {!pos && (
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', color: 'white', borderRadius: 20, padding: '4px 14px', fontSize: '0.75rem', pointerEvents: 'none', zIndex: 500, whiteSpace: 'nowrap' }}>
            Tocá el mapa para marcar tu ubicación
          </div>
        )}

        {geocoding && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 14px', fontSize: '0.75rem', color: '#374151', zIndex: 500, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Obteniendo dirección...
          </div>
        )}
      </div>

      {/* Botón GPS */}
      <button type="button" onClick={usarGPS} disabled={gpsLoading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.55rem', borderRadius: 10, border: `1.5px solid ${PRIMARY}`, background: 'white', color: PRIMARY, fontWeight: 600, fontSize: '0.82rem', cursor: gpsLoading ? 'not-allowed' : 'pointer', opacity: gpsLoading ? 0.7 : 1, transition: 'all .15s' }}
        onMouseEnter={e => { if (!gpsLoading) e.currentTarget.style.background = 'var(--primary-bg, #ecfdf5)'; }}
        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
        {gpsLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={15} />}
        Usar mi ubicación actual
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MapaPicker;
