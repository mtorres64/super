import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  X, ArrowLeftRight, Search, Plus, Trash2, History, Send, Building2,
  FileSpreadsheet, FileText, ArrowLeft, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../App';
import Pagination from '../Pagination';
import { exportTransferExcel, exportTransferPdf } from './transferExport';

const HISTORY_PER_PAGE = 15;

const money = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '—';
  return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

// Detalle de una transferencia (vista en pantalla, sin descargar)
const TransferDetail = ({ t, onBack, onDownload }) => {
  const items = t.items || [];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />Volver al historial
        </button>
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => onDownload(t, 'xlsx')}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-700 border border-green-300 rounded-md px-2 py-1.5 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />Excel
          </button>
          <button
            onClick={() => onDownload(t, 'pdf')}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-700 border border-red-300 rounded-md px-2 py-1.5 hover:bg-red-50"
          >
            <FileText className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }} className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-5 text-sm">
          <div className="col-span-2">
            <div className="text-xs text-gray-400 uppercase mb-0.5">Origen → Destino</div>
            <div className="inline-flex items-center gap-1.5 font-medium text-gray-800">
              <Building2 className="w-4 h-4 text-gray-400" />{t.sucursal_origen_nombre}
              <ArrowLeftRight className="w-4 h-4 text-gray-400" />{t.sucursal_destino_nombre}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">Fecha</div>
            <div className="text-gray-800">{fmtFecha(t.fecha)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">Registró</div>
            <div className="text-gray-800">{t.registrado_por_nombre || '—'}</div>
          </div>
          {t.notas && (
            <div className="col-span-2 md:col-span-4">
              <div className="text-xs text-gray-400 uppercase mb-0.5">Notas</div>
              <div className="text-gray-800">{t.notas}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">Unidades</div>
            <div className="text-gray-800 font-semibold">{t.total_unidades}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">Valor (costo origen)</div>
            <div className="text-gray-800 font-semibold">${money(t.total_valor)}</div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo origen</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Pasó costo</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo destino</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Act. precio</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Precio venta destino</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const costoDest = it.actualizo_costo ? it.costo_destino_nuevo : it.costo_destino_anterior;
                const precioAnt = it.precio_destino_anterior;
                const precioNue = it.actualizo_precio_venta ? it.precio_destino_nuevo : it.precio_destino_anterior;
                const precioCambia = precioAnt != null && precioNue != null && Number(precioAnt) !== Number(precioNue);
                return (
                  <tr key={it.product_id || i} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{it.nombre}</div>
                      <div className="text-xs text-gray-400">{it.codigo_barras || '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">{it.cantidad}</td>
                    <td className="px-3 py-2 text-right text-blue-700">${money(it.costo_origen)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">${money(it.subtotal)}</td>
                    <td className="px-3 py-2 text-center">{it.actualizo_costo ? '✓' : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{costoDest != null ? `$${money(costoDest)}` : '—'}</td>
                    <td className="px-3 py-2 text-center">{it.actualizo_precio_venta ? '✓' : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {precioCambia && (
                        <span className="text-[11px] text-gray-400 line-through mr-1">${money(precioAnt)}</span>
                      )}
                      <span className="text-gray-800 font-medium">{precioNue != null ? `$${money(precioNue)}` : '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">{it.margen_destino != null ? `${money(it.margen_destino)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-800">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-center">{t.total_unidades}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">${money(t.total_valor)}</td>
                <td className="px-3 py-2" colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          «Pasó costo» = el costo de origen se aplicó al destino. «Act. precio» = se recalculó el precio de venta del destino según su margen.
        </p>
      </div>
    </div>
  );
};

const TransferirModal = ({ branches = [], config, closing, onClose, onCompleted }) => {
  const redondeo = config?.redondeo_precio ?? 100;
  const roundPrice = useCallback((v) => {
    if (!v || isNaN(v)) return v;
    if (!redondeo) return Math.round(v * 100) / 100;
    return Math.ceil(v / redondeo) * redondeo;
  }, [redondeo]);

  const activeBranches = branches.filter((b) => b.activo);

  const [tab, setTab] = useState('nueva');

  // ---- Nueva transferencia ----
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([]); // { product_id, nombre, codigo_barras, stock_origen, costo_origen,
  //   margen_destino, precio_destino_actual, costo_destino_actual, tiene_bp_destino, activo_en_destino, destino_resuelto,
  //   cantidad, actualizar_costo, actualizar_precio_venta }
  const [submitting, setSubmitting] = useState(false);

  // Product search (origin branch)
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const searchTimer = useRef(null);
  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);
  // Pistola / lector de código de barras
  const lastKeyRef = useRef(0);
  const scanFlagRef = useRef(false);
  const lastScanRef = useRef({ code: '', time: 0 });
  const handleScanCodeRef = useRef(null);

  // ---- Historial ----
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const dirty = items.length > 0;

  useEffect(() => {
    const onClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleCloseGuard = () => {
    if (dirty && !window.confirm('Hay productos cargados sin confirmar. ¿Cerrar de todos modos?')) return;
    onClose();
  };

  // --- search on origin branch ---
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!origenId || search.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/branches/${origenId}/products`, {
          params: { search: search.trim(), per_page: 25, page: 1 },
        });
        setResults(res.data.items || []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, origenId]);

  // Reset keyboard highlight whenever the result set or its visibility changes
  useEffect(() => { setHighlightIdx(-1); }, [results, showResults]);

  // Keep the highlighted row scrolled into view
  useEffect(() => {
    if (highlightIdx < 0 || !resultsRef.current) return;
    const el = resultsRef.current.querySelector(`[data-res-idx="${highlightIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    const now = Date.now();
    const scanTimeout = config?.barcode_scan_timeout || 100;
    // Tipeo a velocidad de pistola => marcar como escaneo
    if (now - lastKeyRef.current < scanTimeout && val.length >= 8) scanFlagRef.current = true;
    lastKeyRef.current = now;
    setSearch(val);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = search.trim();
      if (!term) return;
      const looksBarcode = scanFlagRef.current || /^\d{6,}$/.test(term);
      scanFlagRef.current = false;
      if (looksBarcode) {
        e.preventDefault();
        handleScanCode(term);
        return;
      }
      if (showResults && highlightIdx >= 0 && results[highlightIdx]) {
        e.preventDefault();
        addProduct(results[highlightIdx]);
      } else if (showResults && results.length === 1) {
        e.preventDefault();
        addProduct(results[0]);
      }
      return;
    }
    if (!showResults || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) { setShowResults(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  // Reset product list when origin changes
  useEffect(() => { setItems([]); setResults([]); setSearch(''); }, [origenId]);

  // Foco automático en el buscador para poder disparar la pistola de inmediato
  useEffect(() => {
    if (tab === 'nueva' && origenId) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [tab, origenId]);

  // Listener global: captura la pistola aunque el buscador no tenga foco
  useEffect(() => {
    if (tab !== 'nueva' || !origenId) return undefined;
    const isInputActive = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };
    let buf = '';
    let last = 0;
    let timer = null;
    const onKey = (e) => {
      if (isInputActive()) return;
      if (e.key.length > 1 && e.key !== 'Enter') return;
      const now = Date.now();
      const scanTimeout = config?.barcode_scan_timeout || 100;
      if (e.key === 'Enter') {
        const code = buf;
        buf = '';
        clearTimeout(timer);
        if (code.length >= 3) handleScanCodeRef.current?.(code);
        return;
      }
      const elapsed = now - last;
      last = now;
      buf = elapsed > 500 ? e.key : buf + e.key;
      if (buf.length >= 8 && elapsed < scanTimeout) {
        clearTimeout(timer);
        const snapshot = buf;
        timer = setTimeout(() => { buf = ''; handleScanCodeRef.current?.(snapshot); }, scanTimeout);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, [tab, origenId, config]);

  const fetchDestinoInfo = useCallback(async (productId) => {
    const fallback = {
      margen_destino: null, precio_destino_actual: null, costo_destino_actual: null,
      tiene_bp_destino: true, activo_en_destino: true, destino_resuelto: false,
    };
    if (!destinoId || !productId) return fallback;
    try {
      const res = await axios.get(`${API}/branches/${destinoId}/product/${productId}`);
      const d = res.data || {};
      return {
        margen_destino: d.margen_sucursal ?? null,
        precio_destino_actual: d.precio_sucursal ?? d.precio_global ?? null,
        costo_destino_actual: d.costo_sucursal ?? null,
        tiene_bp_destino: d.branch_product_id != null,
        activo_en_destino: d.activo_sucursal !== false,
        destino_resuelto: true,
      };
    } catch {
      return fallback;
    }
  }, [destinoId]);

  // When destination changes, refresh destination-side info for already added items
  useEffect(() => {
    if (!destinoId) return;
    let cancelled = false;
    (async () => {
      const current = items;
      if (current.length === 0) return;
      const updated = await Promise.all(current.map(async (it) => {
        const info = await fetchDestinoInfo(it.product_id);
        return { ...it, ...info, margen_destino: info.margen_destino ?? it.margen_destino };
      }));
      if (!cancelled) setItems(updated);
    })();
    return () => { cancelled = true; };
  }, [destinoId, fetchDestinoInfo]); // eslint-disable-line

  const applyDestinoInfo = async (productId) => {
    const info = await fetchDestinoInfo(productId);
    setItems((prev) => prev.map((it) => (it.product_id === productId
      ? { ...it, ...info, margen_destino: info.margen_destino ?? it.margen_destino }
      : it)));
  };

  // Agrega el producto (o suma 1 a la cantidad si ya está). Race-safe para escaneo rápido.
  const addProduct = (p) => {
    let isNew = false;
    let nuevaCantidad = 1;
    setItems((prev) => {
      const ex = prev.find((it) => it.product_id === p.product_id);
      if (ex) {
        nuevaCantidad = (Number(ex.cantidad) || 0) + 1;
        return prev.map((it) => (it.product_id === p.product_id ? { ...it, cantidad: nuevaCantidad } : it));
      }
      isNew = true;
      return [...prev, {
        product_id: p.product_id,
        nombre: p.nombre,
        codigo_barras: p.codigo_barras,
        stock_origen: p.stock_sucursal ?? 0,
        costo_origen: p.costo_sucursal ?? 0,
        margen_destino: p.margen_sucursal ?? null,
        precio_destino_actual: null,
        costo_destino_actual: null,
        tiene_bp_destino: true,
        activo_en_destino: true,
        destino_resuelto: false,
        cantidad: 1,
        actualizar_costo: true,
        actualizar_precio_venta: true,
      }];
    });
    if (isNew && destinoId) applyDestinoInfo(p.product_id);
    toast.success(isNew ? `${p.nombre} agregado` : `${p.nombre} · cant. ${nuevaCantidad}`);
    setSearch(''); setShowResults(false); setResults([]);
    scanFlagRef.current = false;
    searchInputRef.current?.focus();
  };

  // Resuelve un código escaneado por la pistola contra la sucursal de origen y lo agrega.
  const handleScanCode = async (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code || !origenId) return;
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.time < 300) return;
    lastScanRef.current = { code, time: now };
    try {
      const res = await axios.get(`${API}/branches/${origenId}/products`, {
        params: { search: code, per_page: 25, page: 1 },
      });
      const list = res.data.items || [];
      let match = list.find((p) => String(p.codigo_barras || '').trim() === code);
      if (!match && list.length === 1) [match] = list;
      if (!match) {
        toast.error(`Sin resultados para ${code}`);
        setSearch('');
        return;
      }
      addProduct(match);
    } catch {
      toast.error('Error al buscar el código escaneado');
    }
  };
  useEffect(() => { handleScanCodeRef.current = handleScanCode; });

  const updateItem = (productId, patch) => {
    setItems((prev) => prev.map((it) => (it.product_id === productId ? { ...it, ...patch } : it)));
  };
  const removeItem = (productId) => setItems((prev) => prev.filter((it) => it.product_id !== productId));

  // preview of the new selling price at destination for one item
  const previewPrecioDestino = (it) => {
    const costoBase = it.actualizar_costo ? Number(it.costo_origen || 0) : Number(it.costo_destino_actual || 0);
    if (!it.actualizar_precio_venta) return it.precio_destino_actual;
    if (it.margen_destino == null || !costoBase) return it.precio_destino_actual;
    return roundPrice(costoBase * (1 + Number(it.margen_destino) / 100));
  };

  const totalUnidades = items.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
  const totalValor = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * Number(it.costo_origen || 0), 0);

  const allowNegative = config?.allow_negative_stock ?? false;
  const stockError = !allowNegative && items.some((it) => (Number(it.cantidad) || 0) > Number(it.stock_origen || 0));
  const canSubmit = origenId && destinoId && origenId !== destinoId
    && items.length > 0
    && items.every((it) => (Number(it.cantidad) || 0) > 0)
    && !stockError && !submitting;

  // --- history ---
  const loadHistory = useCallback(async (page) => {
    setHistoryLoading(true);
    setSelectedTransfer(null);
    try {
      const res = await axios.get(`${API}/transferencias`, {
        params: { page, per_page: HISTORY_PER_PAGE },
      });
      setHistory(res.data.items || []);
      setHistoryTotal(res.data.total || 0);
      setHistoryPages(res.data.total_pages || 1);
    } catch {
      toast.error('Error al cargar el historial');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'historial') loadHistory(historyPage);
    else setSelectedTransfer(null);
  }, [tab, historyPage, loadHistory]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/transferencias`, {
        sucursal_origen_id: origenId,
        sucursal_destino_id: destinoId,
        notas: notas.trim() || null,
        items: items.map((it) => ({
          product_id: it.product_id,
          cantidad: Number(it.cantidad) || 0,
          actualizar_costo: !!it.actualizar_costo,
          actualizar_precio_venta: !!it.actualizar_precio_venta,
        })),
      });
      toast.success('Transferencia registrada');
      setItems([]); setNotas(''); setSearch('');
      onCompleted && onCompleted();
      setTab('historial');
      setHistoryPage(1);
      loadHistory(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo registrar la transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTransfer = (t, format) => {
    try {
      if (format === 'pdf') exportTransferPdf(t);
      else exportTransferExcel(t);
    } catch (err) {
      toast.error('No se pudo generar el archivo');
    }
  };

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`}>
      <div
        className={`modal-content${closing ? ' closing' : ''}`}
        style={{
          maxWidth: '1400px', width: '98vw', height: '96vh', maxHeight: '96vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Transferir stock entre sucursales
          </h2>
          <button onClick={handleCloseGuard} className="modal-close"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 px-6 flex-shrink-0">
          {[
            { id: 'nueva', label: 'Nueva transferencia', icon: Send },
            { id: 'historial', label: 'Historial', icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'nueva' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem 1.5rem 0' }}>
            {/* Sucursales */}
            <div className="flex flex-wrap gap-4 items-end mb-4 flex-shrink-0">
              <div className="w-60">
                <label className="form-label">Sucursal origen *</label>
                <select className="form-input" value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
                  <option value="">— Seleccioná —</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.id === destinoId}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="pb-2 text-gray-400"><ArrowLeftRight className="w-5 h-5" /></div>
              <div className="w-60">
                <label className="form-label">Sucursal destino *</label>
                <select className="form-input" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
                  <option value="">— Seleccioná —</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.id === origenId}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="form-label">Notas (opcional)</label>
                <input className="form-input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Referencia, remito, etc." />
              </div>
            </div>

            {/* Buscador de productos */}
            <div className="relative mb-3 flex-shrink-0" ref={searchBoxRef}>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  className="form-input pl-9"
                  placeholder={origenId ? 'Buscar o escanear con la pistola…' : 'Seleccioná primero la sucursal de origen'}
                  value={search}
                  disabled={!origenId}
                  onChange={handleSearchChange}
                  onFocus={() => results.length && setShowResults(true)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              {origenId && (
                <p className="mt-1 text-xs text-gray-400">
                  Escaneá con la pistola para ir cargando productos (cada lectura del mismo código suma 1).
                </p>
              )}
              {showResults && (searching || results.length > 0) && (
                <div ref={resultsRef} className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {searching && <div className="px-3 py-2 text-sm text-gray-400">Buscando…</div>}
                  {!searching && results.map((p, i) => (
                    <button
                      key={p.product_id}
                      data-res-idx={i}
                      onClick={() => addProduct(p)}
                      onMouseEnter={() => setHighlightIdx(i)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left ${
                        i === highlightIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1">
                        <span className="font-medium text-gray-800">{p.nombre}</span>
                        {p.codigo_barras && <span className="text-gray-400 ml-2 text-xs">{p.codigo_barras}</span>}
                      </span>
                      <span className={`text-xs ${(p.stock_sucursal ?? 0) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                        stock: {p.stock_sucursal ?? 0}
                      </span>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  ))}
                  {!searching && results.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                  )}
                </div>
              )}
            </div>

            {/* Tabla de items */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="border border-gray-200 rounded-lg mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Stock origen</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo origen</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Pasa costo</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Actualiza precio venta</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Precio venta destino</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400 text-sm">
                      {origenId ? 'Buscá y agregá productos para transferir' : 'Seleccioná la sucursal de origen'}
                    </td></tr>
                  )}
                  {items.map((it, i) => {
                    const cantidad = Number(it.cantidad) || 0;
                    const excede = cantidad > Number(it.stock_origen || 0);
                    const nuevoPrecio = previewPrecioDestino(it);
                    const precioBaja = nuevoPrecio != null && it.precio_destino_actual != null && nuevoPrecio < it.precio_destino_actual;
                    return (
                      <tr key={it.product_id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">{it.nombre}</div>
                          <div className="text-xs text-gray-400">
                            {it.codigo_barras || '—'}
                            {it.destino_resuelto && !it.tiene_bp_destino && (
                              <span className="ml-2 text-amber-600">· se creará el precio en destino</span>
                            )}
                            {it.destino_resuelto && it.tiene_bp_destino && !it.activo_en_destino && (
                              <span className="ml-2 text-amber-600">· inactivo en destino</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{it.stock_origen ?? 0}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min="0" step="1"
                            className="form-input py-0.5 text-xs text-center w-16"
                            style={excede ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                            value={it.cantidad}
                            onChange={(e) => updateItem(it.product_id, { cantidad: e.target.value })}
                            onClick={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-blue-700 font-semibold">${money(it.costo_origen)}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox" className="w-4 h-4 accent-blue-600"
                            checked={it.actualizar_costo}
                            onChange={(e) => updateItem(it.product_id, { actualizar_costo: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox" className="w-4 h-4 accent-green-600"
                            checked={it.actualizar_precio_venta}
                            onChange={(e) => updateItem(it.product_id, { actualizar_precio_venta: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-col items-end leading-tight">
                            {it.precio_destino_actual != null && nuevoPrecio != null
                              && Number(nuevoPrecio) !== Number(it.precio_destino_actual) && (
                              <span className="text-[11px] text-gray-400 line-through">${money(it.precio_destino_actual)}</span>
                            )}
                            <span className={precioBaja ? 'text-red-600 font-semibold' : 'text-gray-800 font-semibold'}>
                              {nuevoPrecio != null ? `$${money(nuevoPrecio)}` : '—'}
                            </span>
                            {it.actualizar_precio_venta && it.margen_destino != null && (
                              <span className="text-[11px] text-gray-400">
                                margen {money(it.margen_destino)}%
                                {it.destino_resuelto && !it.tiene_bp_destino ? ' (de origen)' : ''}
                              </span>
                            )}
                            {!it.actualizar_precio_venta && (
                              <span className="text-[11px] text-gray-400">sin cambios</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          ${money(cantidad * Number(it.costo_origen || 0))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeItem(it.product_id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 pb-5">
              {stockError && (
                <p className="text-xs text-red-600 mb-2">
                  Hay productos con cantidad mayor al stock disponible en la sucursal de origen.
                </p>
              )}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-500">Unidades: <strong className="text-gray-800">{totalUnidades}</strong></span>
                  <span className="text-gray-500">Valor del movimiento (costo origen): <strong className="text-gray-800">${money(totalValor)}</strong></span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCloseGuard} className="btn btn-secondary">Cerrar</button>
                  <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={!canSubmit}>
                    {submitting ? <span className="spinner w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                    Confirmar transferencia
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ---- Historial ---- */
          selectedTransfer ? (
            <TransferDetail
              t={selectedTransfer}
              onBack={() => setSelectedTransfer(null)}
              onDownload={downloadTransfer}
            />
          ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }} className="px-6 py-4">
              {historyLoading ? (
                <div className="flex justify-center py-12"><div className="spinner w-6 h-6" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Todavía no hay transferencias registradas</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Origen → Destino</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Productos</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Unidades</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Valor (costo origen)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Registró</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Descargar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((t, i) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTransfer(t)}
                        className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50/50 ${i % 2 ? 'bg-gray-50/40' : ''}`}
                      >
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtFecha(t.fecha)}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5 text-gray-800">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {t.sucursal_origen_nombre}
                            <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
                            {t.sucursal_destino_nombre}
                          </span>
                          {t.notas && <div className="text-xs text-gray-400 mt-0.5">{t.notas}</div>}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{(t.items || []).length}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{t.total_unidades}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">${money(t.total_valor)}</td>
                        <td className="px-3 py-2 text-gray-500">{t.registrado_por_nombre || '—'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTransfer(t); }}
                              title="Ver detalle"
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-md px-2 py-1.5 hover:bg-gray-50"
                            >
                              <Eye className="w-3.5 h-3.5" />Ver
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadTransfer(t, 'xlsx'); }}
                              title="Descargar Excel"
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 border border-green-300 rounded-md px-2 py-1.5 hover:bg-green-50"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />Excel
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadTransfer(t, 'pdf'); }}
                              title="Descargar PDF"
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 border border-red-300 rounded-md px-2 py-1.5 hover:bg-red-50"
                            >
                              <FileText className="w-3.5 h-3.5" />PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex-shrink-0">
              <Pagination
                currentPage={historyPage}
                totalPages={historyPages}
                totalItems={historyTotal}
                itemsPerPage={HISTORY_PER_PAGE}
                onPageChange={setHistoryPage}
                itemName="transferencias"
              />
            </div>
          </div>
          )
        )}
      </div>
    </div>,
    document.body,
  );
};

export default TransferirModal;
