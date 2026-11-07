import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { ScrollText } from 'lucide-react';
import SearchInput from '../ui/SearchInput';
import DistribuirModal from '../Compras/DistribuirModal';
import useDistribuirCompra from '../Compras/useDistribuirCompra';
import Pagination from '../Pagination';

const PER_PAGE = 50;

const CAMPO_LABEL = {
  precio: 'Precio de venta',
  costo: 'Costo',
  precio_por_peso: 'Precio por peso',
};

const fmtMoney = (v) =>
  v === null || v === undefined
    ? '—'
    : Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return '';
  // el backend guarda UTC sin zona explícita en algunos casos
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
};

// Compra asociada al log: campo estructurado o, en logs viejos, el id dentro del detalle
const getCompraId = (l) => {
  if (l.referencia_tipo === 'compra' && l.referencia_id) return l.referencia_id;
  const m = /^Compra ([0-9a-f-]{36})$/i.exec(l.detalle || '');
  return m ? m[1] : null;
};

const AuditLogsView = () => {
  const [branches, setBranches] = useState([]);
  const [openingId, setOpeningId] = useState(null);
  const distribuir = useDistribuirCompra({ branches });

  useEffect(() => {
    axios.get(`${API}/branches`).then(r => setBranches(r.data)).catch(() => {});
  }, []);

  // Abre "Aplicar a sucursal" de la compra del log, sin salir de esta pantalla
  const verCompra = async (log) => {
    setOpeningId(log.id);
    try {
      const res = await axios.get(`${API}/compras/${getCompraId(log)}`);
      distribuir.open(res.data, log.sucursal_id || null);
    } catch {
      toast.error('No se pudo abrir la compra (puede haber sido eliminada)');
    } finally {
      setOpeningId(null);
    }
  };

  const [tipos, setTipos] = useState([]);
  const [tipo, setTipo] = useState('movimiento_precio');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/audit-logs/tipos`)
      .then(r => setTipos(r.data))
      .catch(() => setTipos([{ id: 'movimiento_precio', nombre: 'Movimiento de precio' }]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, tipo, desde, hasta]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PER_PAGE };
      if (tipo) params.tipo = tipo;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (desde) params.fecha_desde = new Date(`${desde}T00:00:00`).toISOString();
      if (hasta) {
        const h = new Date(`${hasta}T00:00:00`);
        h.setDate(h.getDate() + 1); // límite superior exclusivo
        params.fecha_hasta = h.toISOString();
      }
      const res = await axios.get(`${API}/audit-logs`, { params });
      setData(res.data);
    } catch {
      toast.error('Error al cargar los logs');
    } finally {
      setLoading(false);
    }
  }, [page, tipo, debouncedSearch, desde, hasta]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Logs del sistema</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className="form-label">Buscar</label>
          <SearchInput
            value={search}
            onChange={setSearch}
            loading={loading && search !== ''}
            placeholder="Usuario, producto, código, sucursal, pantalla, acción..."
          />
        </div>
        <div>
          <label className="form-label">Tipo de log</label>
          <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={desde} max={hasta || undefined}
              onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={hasta} min={desde || undefined}
              onChange={e => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Fecha</th>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Sucursal del precio</th>
              <th className="px-3 py-2 font-medium">Hecho desde sucursal</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Campo</th>
              <th className="px-3 py-2 font-medium text-right">Antes</th>
              <th className="px-3 py-2 font-medium text-right">Después</th>
              <th className="px-3 py-2 font-medium">Pantalla</th>
              <th className="px-3 py-2 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map(l => (
              <tr key={l.id} className="hover:bg-gray-50" title={l.detalle || ''}>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.fecha)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{l.usuario_nombre}</div>
                  <div className="text-xs text-gray-500">{l.usuario_email}</div>
                </td>
                <td className="px-3 py-2">{l.sucursal_nombre || '—'}</td>
                <td className="px-3 py-2">{l.sucursal_sesion_nombre || '—'}</td>
                <td className="px-3 py-2">
                  <div className="text-gray-900">{l.producto_nombre}</div>
                  {l.codigo_barras && <div className="text-xs text-gray-500">{l.codigo_barras}</div>}
                </td>
                <td className="px-3 py-2">{CAMPO_LABEL[l.campo] || l.campo}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">{fmtMoney(l.valor_anterior)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtMoney(l.valor_nuevo)}</td>
                <td className="px-3 py-2">{l.pantalla}</td>
                <td className="px-3 py-2">
                  {l.accion}
                  {getCompraId(l)
                    ? <div className="text-xs">
                        <button type="button" onClick={() => verCompra(l)} disabled={openingId === l.id}
                          className="hover:underline font-medium" style={{ color: 'var(--primary)' }}>
                          {openingId === l.id ? 'Abriendo...' : 'Ver'}
                        </button>
                      </div>
                    : l.detalle && <div className="text-xs text-gray-500">{l.detalle}</div>}
                </td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                  No hay logs para los filtros seleccionados
                </td>
              </tr>
            )}
            {loading && data.items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center"><div className="spinner w-6 h-6 mx-auto" /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={data.total_pages}
          totalItems={data.total}
          itemsPerPage={PER_PAGE}
          onPageChange={setPage}
          itemName="registros"
        />
      </div>

      {distribuir.modal && (
        <DistribuirModal
          compra={distribuir.modal.compra}
          branches={branches}
          form={distribuir.form}
          onSucursalChange={distribuir.handleSucursalChange}
          onOpcionChange={distribuir.handleOpcionChange}
          onItemChange={distribuir.handleItemChange}
          onClose={distribuir.closeAnim}
          onSubmit={(e) => e.preventDefault()}
          loading={distribuir.loading}
          closing={distribuir.closing}
          formatMoney={fmtMoney}
          readOnly
        />
      )}
    </div>
  );
};

export default AuditLogsView;
