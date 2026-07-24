import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents } from 'react-leaflet';
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

const pinSvg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 21.875 12.5 41 12.5 41C12.5 41 25 21.875 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="${color}"/>
  <circle cx="12.5" cy="12.5" r="5" fill="white"/>
</svg>`;

const makeIcon = (color) => L.divIcon({ className: '', html: pinSvg(color), iconSize: [25, 41], iconAnchor: [12, 41] });

function ClickHandler({ onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FitView({ clientPos, sucursalPos, radioKm }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (radioKm > 0 && !sucursalPos) {
      // Solo en admin (sin sucursal): hacer zoom al círculo
      if (!clientPos) return;
      const [lat, lng] = clientPos;
      const dLat = radioKm / 111.32;
      const dLng = radioKm / (111.32 * Math.cos(lat * Math.PI / 180));
      const bounds = L.latLngBounds([lat - dLat, lng - dLng], [lat + dLat, lng + dLng]);
      map.fitBounds(bounds, { padding: [6, 6], animate: false });
      return;
    }
    if (!clientPos) return;
    if (sucursalPos) {
      map.fitBounds(L.latLngBounds([clientPos, sucursalPos]), { padding: [24, 24], animate: false });
    } else {
      map.setView(clientPos, 16, { animate: false });
    }
  }, [clientPos, sucursalPos, radioKm, map]); // eslint-disable-line
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

async function fetchRuta(sLng, sLat, cLng, cLat) {
  const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${cLng},${cLat}?overview=full&geometries=geojson`;
  const data = await fetch(url).then(r => r.json());
  const coords = data?.routes?.[0]?.geometry?.coordinates;
  return coords ? coords.map(([lng, lat]) => [lat, lng]) : null;
}

const MapaPicker = ({ coordenadas, onCoordenadas, onDireccion, direccionInicial, sucursal, radioKm }) => {
  const iconSucursal = React.useMemo(() => makeIcon('#2563eb'), []);
  const iconCliente  = React.useMemo(() => makeIcon('#ef4444'), []);
  const [pos, setPos] = useState(coordenadas ? [coordenadas.lat, coordenadas.lng] : null);
  const [ruta, setRuta] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);

  // Sincronizar pos cuando cambian las coordenadas guardadas (ej: cambio de sucursal)
  const prevCoordsRef = useRef(coordenadas);
  useEffect(() => {
    if (!coordenadas) return;
    if (prevCoordsRef.current?.lat !== coordenadas.lat || prevCoordsRef.current?.lng !== coordenadas.lng) {
      prevCoordsRef.current = coordenadas;
      setPos([coordenadas.lat, coordenadas.lng]);
    }
  }, [coordenadas?.lat, coordenadas?.lng]); // eslint-disable-line

  // Si no hay coordenadas guardadas pero sí hay dirección previa, geocodificarla al montar
  useEffect(() => {
    if (pos || !direccionInicial?.trim()) return;
    forwardGeocode(direccionInicial).then(results => {
      if (results?.[0]) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        setPos([lat, lng]);
        onCoordenadas({ lat, lng });
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Fetchear ruta cuando hay pin de cliente y sucursal con coordenadas
  useEffect(() => {
    if (!pos || !sucursal?.lat || !sucursal?.lng) { setRuta(null); return; }
    fetchRuta(sucursal.lng, sucursal.lat, pos[1], pos[0])
      .then(r => setRuta(r))
      .catch(() => setRuta(null));
  }, [pos, sucursal]);

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
          center={pos || (sucursal?.lat ? [sucursal.lat, sucursal.lng] : ARGENTINA)}
          zoom={pos ? 14 : 13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={selectLocation} />
          {(pos || (radioKm > 0 && sucursal?.lat)) && <FitView clientPos={pos} sucursalPos={sucursal?.lat ? [sucursal.lat, sucursal.lng] : null} radioKm={radioKm} />}
          {sucursal?.lat && <Marker position={[sucursal.lat, sucursal.lng]} icon={iconSucursal} />}
          {sucursal?.lat && radioKm > 0 && (
            <Circle center={[sucursal.lat, sucursal.lng]} radius={radioKm * 1000}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }} />
          )}
          {!sucursal?.lat && pos && radioKm > 0 && (
            <Circle center={pos} radius={radioKm * 1000}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }} />
          )}
          {pos && <Marker position={pos} icon={iconCliente} />}
          {ruta && <Polyline positions={ruta} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }} />}
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
