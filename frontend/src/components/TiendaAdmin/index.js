import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, API } from '../../App';
import {
  ShoppingBag, Settings, ExternalLink, Copy, Check,
  MapPin, Store, ChevronDown, RefreshCw, Link, Printer, ShoppingCart, Pencil, QrCode, X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import PaginationView from '../Pagination/PaginationView';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

// AudioContext reutilizado — los navegadores bloquean uno nuevo sin interacción previa
let _audioCtx = null;
const _getAudioCtx = () => {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
};
// Desbloquear en el primer clic del usuario
if (typeof window !== 'undefined') {
  const _unlock = () => {
    try { _getAudioCtx().resume(); } catch (_) {}
    window.removeEventListener('click', _unlock);
    window.removeEventListener('touchend', _unlock);
  };
  window.addEventListener('click', _unlock);
  window.addEventListener('touchend', _unlock);
}

const playNotificationSound = () => {
  try {
    const ctx = _getAudioCtx();
    const play = () => {
      const notes = [523.25, 659.25, 783.99]; // Do Mi Sol
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch (_) {}
};

const ESTADOS = [
  { value: 'pendiente',       label: 'Pendiente',       color: '#f59e0b', bg: '#fffbeb' },
  { value: 'aceptado',        label: 'Aceptado',        color: '#3b82f6', bg: '#eff6ff' },
  { value: 'en_preparacion',  label: 'En preparación',  color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'listo',           label: 'Listo',            color: '#10b981', bg: '#ecfdf5' },
  { value: 'entregado',       label: 'Entregado',        color: '#6b7280', bg: '#f9fafb' },
  { value: 'cancelado',       label: 'Cancelado',        color: '#ef4444', bg: '#fef2f2' },
];

const estadoInfo = (val) => ESTADOS.find(e => e.value === val) || ESTADOS[0];

const Badge = ({ estado }) => {
  const info = estadoInfo(estado);
  return (
    <span style={{ background: info.bg, color: info.color, padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {info.label}
    </span>
  );
};

const imprimirPedidoA4 = (p, config) => {
  const sym = config?.currency_symbol || '$';
  const empresa = config?.company_name || '';
  const fecha = p.fecha ? new Date(p.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const entrega = p.tipo_entrega === 'domicilio' ? `Domicilio: ${p.direccion_entrega || ''}` : 'Retiro en local';

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;
  const colRight = W - margin;
  let y = 0;

  const sectionTitle = (text, yPos) => {
    pdf.setFillColor(40, 40, 40);
    pdf.rect(margin, yPos, colRight - margin, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text, margin + 3, yPos + 5);
    pdf.setTextColor(0, 0, 0);
    return yPos + 10;
  };
  const row = (label, value, yPos, bold = false) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, margin + 2, yPos);
    pdf.text(value, colRight - 2, yPos, { align: 'right' });
    return yPos + 6;
  };

  // Header negro
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, W, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`PEDIDO #${p.numero_factura}`, W / 2, 13, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const subtitulo = [empresa, fecha].filter(Boolean).join('   |   ');
  if (subtitulo) pdf.text(subtitulo, W / 2, 22, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y = 34;

  // Sección datos del pedido
  y = sectionTitle('DATOS DEL PEDIDO', y);
  y = row('Cliente', p.tienda_customer_nombre || '', y);
  if (p.tienda_customer_telefono) y = row('Teléfono', p.tienda_customer_telefono, y);
  y = row('Entrega', entrega, y);
  if (p.observaciones_tienda) y = row('Observaciones', p.observaciones_tienda, y);
  y += 4;

  // Sección productos
  y = sectionTitle('PRODUCTOS', y);
  // Header tabla
  pdf.setFillColor(230, 230, 230);
  pdf.rect(margin, y, colRight - margin, 6, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Producto', margin + 2, y + 4);
  pdf.text('Cant.', margin + 110, y + 4, { align: 'right' });
  pdf.text('P. Unit.', margin + 135, y + 4, { align: 'right' });
  pdf.text('Subtotal', colRight - 2, y + 4, { align: 'right' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  (p.items || []).forEach((item, i) => {
    if (y > 270) { pdf.addPage(); y = 20; }
    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
    }
    pdf.setFontSize(8);
    pdf.text(item.nombre, margin + 2, y + 3);
    pdf.text(String(item.cantidad), margin + 110, y + 3, { align: 'right' });
    pdf.text(`${sym}${item.precio_unitario.toFixed(2)}`, margin + 135, y + 3, { align: 'right' });
    pdf.text(`${sym}${(item.precio_unitario * item.cantidad).toFixed(2)}`, colRight - 2, y + 3, { align: 'right' });
    y += 6;
  });
  y += 4;

  // Desglose de totales
  const pSubtotal   = p.subtotal ?? (p.items || []).reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const pImpuestos  = p.impuestos || 0;
  const pDescuento  = p.descuento || 0;
  const pExtraTotal = p.impuestos_extra_total || 0;
  const pCostoEnvio = p.costo_envio || 0;
  const pAjuste     = (p.total || 0) - pSubtotal - pImpuestos + pDescuento - pExtraTotal;
  const pMetodo     = p.metodo_pago || '';
  const pMetodoLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[pMetodo] || pMetodo;
  const hayDesglose = Math.abs(pAjuste) > 0.01 || pDescuento > 0 || pCostoEnvio > 0;

  pdf.setDrawColor(180);
  pdf.line(margin, y, colRight, y);
  y += 5;

  if (hayDesglose) {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text('Subtotal', margin + 2, y);
    pdf.text(`${sym}${pSubtotal.toFixed(2)}`, colRight - 2, y, { align: 'right' });
    y += 5;
    if (pCostoEnvio > 0) {
      pdf.text('Envío', margin + 2, y);
      pdf.text(`${sym}${pCostoEnvio.toFixed(2)}`, colRight - 2, y, { align: 'right' });
      y += 5;
    }
    if (pDescuento > 0) {
      pdf.setTextColor(5, 150, 105);
      pdf.text('Descuento', margin + 2, y);
      pdf.text(`-${sym}${pDescuento.toFixed(2)}`, colRight - 2, y, { align: 'right' });
      y += 5;
    }
    if (Math.abs(pAjuste) > 0.01) {
      pdf.setTextColor(pAjuste < 0 ? 5 : 220, pAjuste < 0 ? 150 : 38, pAjuste < 0 ? 105 : 38);
      const ajLabel = pAjuste < 0 ? `Desc. ${pMetodoLabel}` : `Recargo ${pMetodoLabel}`;
      pdf.text(ajLabel, margin + 2, y);
      pdf.text(`${pAjuste < 0 ? '-' : '+'}${sym}${Math.abs(pAjuste).toFixed(2)}`, colRight - 2, y, { align: 'right' });
      y += 5;
    }
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(80);
    pdf.line(margin, y, colRight, y);
    y += 5;
  }

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', margin + 2, y);
  pdf.text(`${sym}${p.total?.toFixed(2)}`, colRight - 2, y, { align: 'right' });

  // Footer
  const totalPages = pdf.internal.pages.length - 1;
  for (let pg = 1; pg <= totalPages; pg++) {
    pdf.setPage(pg);
    pdf.setDrawColor(180);
    pdf.line(margin, 285, colRight, 285);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`Generado el ${new Date().toLocaleString('es-AR')}`, margin, 290);
    pdf.text(`Página ${pg} de ${totalPages}`, colRight, 290, { align: 'right' });
  }

  pdf.autoPrint();
  window.open(pdf.output('bloburl'), '_blank');
};

const imprimirPedidoTicket = (p, config) => {
  const sym = config?.currency_symbol || '$';
  const fecha = p.fecha ? new Date(p.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const entrega = p.tipo_entrega === 'domicilio' ? `Domicilio: ${p.direccion_entrega || ''}` : 'Retiro en local';
  const itemsHtml = (p.items || []).map(item =>
    `<tr>
      <td style="padding:7px 6px;font-size:0.9rem;border-bottom:1px solid #e5e7eb;">${item.nombre}</td>
      <td style="padding:7px 6px;font-size:0.9rem;font-weight:700;text-align:center;border-bottom:1px solid #e5e7eb;">${item.cantidad}</td>
      <td style="padding:7px 6px;font-size:0.9rem;text-align:right;border-bottom:1px solid #e5e7eb;">${sym}${(item.precio_unitario * item.cantidad).toFixed(2)}</td>
    </tr>`
  ).join('');

  const tSubtotal   = p.subtotal ?? (p.items || []).reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const tImpuestos  = p.impuestos || 0;
  const tDescuento  = p.descuento || 0;
  const tExtraTotal = p.impuestos_extra_total || 0;
  const tCostoEnvio = p.costo_envio || 0;
  const tAjuste     = (p.total || 0) - tSubtotal - tImpuestos + tDescuento - tExtraTotal;
  const tMetodo     = p.metodo_pago || '';
  const tMetodoLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[tMetodo] || tMetodo;
  const hayDesglose = Math.abs(tAjuste) > 0.01 || tDescuento > 0 || tCostoEnvio > 0;

  const desgloseHtml = hayDesglose ? `
    <div style="border-top:1px dashed #ccc;margin-top:4px;padding-top:4px;font-size:0.8rem;display:flex;flex-direction:column;gap:2px;">
      <div style="display:flex;justify-content:space-between;color:#555;"><span>Subtotal</span><span>${sym}${tSubtotal.toFixed(2)}</span></div>
      ${tCostoEnvio > 0 ? `<div style="display:flex;justify-content:space-between;color:#555;"><span>Envío</span><span>${sym}${tCostoEnvio.toFixed(2)}</span></div>` : ''}
      ${tDescuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#059669;"><span>Descuento</span><span>-${sym}${tDescuento.toFixed(2)}</span></div>` : ''}
      ${Math.abs(tAjuste) > 0.01 ? `<div style="display:flex;justify-content:space-between;color:${tAjuste < 0 ? '#059669' : '#dc2626'};font-weight:600;"><span>${tAjuste < 0 ? `Desc. ${tMetodoLabel}` : `Recargo ${tMetodoLabel}`}</span><span>${tAjuste < 0 ? '-' : '+'}${sym}${Math.abs(tAjuste).toFixed(2)}</span></div>` : ''}
    </div>` : '';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pedido #${p.numero_factura}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: 80mm auto; margin: 4mm 5mm; }
    body { font-family: Arial, sans-serif; color: #111; max-width: 70mm; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .sub { font-size: 0.8rem; color: #555; margin-bottom: 10px; }
    .info-block { margin-bottom: 4px; }
    .info-block .label { font-size: 0.65rem; text-transform: uppercase; color: #888; }
    .info-block .val { font-size: 0.85rem; font-weight: 600; }
    hr { border: none; border-top: 2px solid #111; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th { text-align: left; font-size: 0.65rem; text-transform: uppercase; color: #888; padding: 4px 6px; border-bottom: 2px solid #111; }
    th:nth-child(2) { text-align: center; } th:nth-child(3) { text-align: right; }
    .total-row { font-size: 1rem; font-weight: 700; display:flex; justify-content:space-between; padding-top: 6px; border-top: 2px solid #111; margin-top: 4px; }
    .obs { border-left: 3px solid #8b5cf6; padding: 6px 10px; font-style: italic; font-size: 0.8rem; margin-bottom: 10px; }
    @media print { button { display: none !important; } }
  </style></head><body>
  <h1>#${p.numero_factura}</h1>
  <p class="sub">${fecha}</p>
  <hr>
  <div class="info-block"><div class="label">Cliente</div><div class="val">${p.tienda_customer_nombre}</div></div>
  ${p.tienda_customer_telefono ? `<div class="info-block"><div class="label">Teléfono</div><div class="val">${p.tienda_customer_telefono}</div></div>` : ''}
  <div class="info-block"><div class="label">Entrega</div><div class="val">${entrega}</div></div>
  <hr>
  ${p.observaciones_tienda ? `<div class="obs">Obs: ${p.observaciones_tienda}</div>` : ''}
  <table>
    <thead><tr><th>Producto</th><th>Cant.</th><th>Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  ${desgloseHtml}
  <div class="total-row"><span>Total</span><span>${sym}${p.total?.toFixed(2)}</span></div>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
  </body></html>`;
  const win = window.open('', '_blank', 'width=420,height=600');
  const blob = new Blob([html], { type: 'text/html' });
  win.location.href = URL.createObjectURL(blob);
};

const imprimirPedido = (p, config) => {
  if (config?.receipt_format === 'a4') {
    imprimirPedidoA4(p, config);
  } else {
    imprimirPedidoTicket(p, config);
  }
};

// ── Tab Pedidos ───────────────────────────────────────────────────────────────

const TabPedidos = ({ initialExpandId }) => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [printConfig, setPrintConfig] = useState(null);

  const abrirEnPOS = (p) => {
    sessionStorage.setItem('tienda_pedido_en_pos', JSON.stringify(p));
    navigate('/pos');
  };
  const pendingExpandRef = useRef(initialExpandId || null);
  const fetchPedidosRef = React.useRef(null);

  useEffect(() => {
    axios.get(`${API}/config`).then(res => setPrintConfig(res.data)).catch(() => {});
  }, []);

  const fetchPedidos = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    const params = { page, per_page: 15 };
    if (filtroEstado) params.estado = filtroEstado;
    axios.get(`${API}/pedidos`, { params })
      .then(res => {
        setPedidos(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
        if (pendingExpandRef.current) {
          const found = res.data.items.find(p => p.id === pendingExpandRef.current);
          if (found) {
            setExpandido(found.id);
            pendingExpandRef.current = null;
          }
        }
      })
      .catch(() => { if (!silent) toast.error('Error al cargar pedidos'); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [page, filtroEstado]);

  // Mantener ref siempre actualizada para usarla desde el SSE sin re-crear la conexión
  useEffect(() => { fetchPedidosRef.current = fetchPedidos; }, [fetchPedidos]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  // SSE — conexión en tiempo real
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    let es = null;
    let reconnectTimer = null;
    let delay = 2000;

    const connect = () => {
      es = new EventSource(`${BACKEND_URL}/api/pedidos/eventos?token=${token}`);
      es.onopen = () => { delay = 2000; };
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'pedido_nuevo') {
            playNotificationSound();
            toast.success(
              `¡Nuevo pedido #${data.numero_pedido}! — ${data.cliente} · $${data.total?.toFixed(0)}`,
              { duration: 8000 }
            );
            window.dispatchEvent(new Event('tienda-pedido-nuevo'));
            fetchPedidosRef.current?.(true);
          }
        } catch (_) {}
      };
      es.onerror = () => {
        es.close();
        reconnectTimer = setTimeout(() => {
          delay = Math.min(delay * 2, 30000);
          connect();
        }, delay);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []); // se conecta una sola vez; fetchPedidosRef mantiene la ref actualizada

  const handleEstadoChange = async (saleId, nuevoEstado) => {
    setUpdatingId(saleId);
    try {
      await axios.patch(`${API}/pedidos/${saleId}/estado`, { estado_pedido: nuevoEstado });
      setPedidos(prev => prev.map(p => p.id === saleId ? { ...p, estado_pedido: nuevoEstado } : p));
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar estado');
    } finally { setUpdatingId(null); }
  };

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 0.85rem', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => fetchPedidos(false)} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#374151' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af' }}>{total} pedido{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-green-600" />
        </div>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          <ShoppingBag size={40} style={{ marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
          <p>{filtroEstado ? 'No hay pedidos con ese estado.' : 'No hay pedidos de la tienda aún.'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {pedidos.map(p => (
              <div key={p.id} style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
                {/* Header del pedido */}
                <div style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
                  onClick={() => setExpandido(expandido === p.id ? null : p.id)}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>#{p.numero_factura}</span>
                      <Badge estado={p.estado_pedido || 'pendiente'} />
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {p.tipo_entrega === 'domicilio' ? <MapPin size={11} /> : <Store size={11} />}
                        {p.tipo_entrega === 'domicilio' ? (p.direccion_entrega || 'Domicilio') : 'Retiro en local'}
                      </span>
                      {p.fecha_modificacion && (
                        <span title={`Modificado el ${new Date(p.fecha_modificacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                          style={{ fontSize: '0.72rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 7px', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, cursor: 'default' }}>
                          <Pencil size={10} /> Modificado
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                      {p.tienda_customer_nombre} · {p.tienda_customer_email} {p.tienda_customer_telefono && `· ${p.tienda_customer_telefono}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', margin: '0 0 2px' }}>${p.total?.toFixed(2)}</p>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                      {p.fecha ? new Date(p.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <ChevronDown size={16} style={{ color: '#9ca3af', transform: expandido === p.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }} />
                </div>

                {/* Detalle expandido */}
                {expandido === p.id && (
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #f3f4f6' }}>
                    {/* Items */}
                    <div style={{ padding: '0.75rem 0 0.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(p.items || []).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#374151' }}>{item.nombre} <span style={{ color: '#9ca3af' }}>×{item.cantidad}</span></span>
                          <span style={{ fontWeight: 600, color: '#111827' }}>${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Desglose de totales */}
                    {(() => {
                      const subtotal   = p.subtotal ?? (p.items || []).reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
                      const impuestos  = p.impuestos || 0;
                      const descuento  = p.descuento || 0;
                      const extraTotal = p.impuestos_extra_total || 0;
                      const costoEnvio = p.costo_envio || 0;
                      const ajuste     = (p.total || 0) - subtotal - impuestos + descuento - extraTotal;
                      const metodo     = p.metodo_pago || '';
                      const metodoLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[metodo] || metodo;
                      const showBreakdown = Math.abs(ajuste) > 0.01 || descuento > 0 || costoEnvio > 0;
                      if (!showBreakdown) return <div style={{ marginBottom: '0.75rem' }} />;
                      return (
                        <div style={{ borderTop: '1px dashed #e5e7eb', margin: '0.4rem 0 0.75rem', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                          </div>
                          {costoEnvio > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                              <span>Envío</span><span>${costoEnvio.toFixed(2)}</span>
                            </div>
                          )}
                          {descuento > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#059669' }}>
                              <span>Descuento</span><span>-${descuento.toFixed(2)}</span>
                            </div>
                          )}
                          {Math.abs(ajuste) > 0.01 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: ajuste < 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                              <span>{ajuste < 0 ? `Desc. ${metodoLabel}` : `Recargo ${metodoLabel}`}</span>
                              <span>{ajuste < 0 ? '-' : '+'}${Math.abs(ajuste).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {p.direccion_entrega && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{p.direccion_entrega}
                      </p>
                    )}
                    {p.observaciones_tienda && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic', marginBottom: '0.75rem' }}>"{p.observaciones_tienda}"</p>
                    )}
                    {/* Cambiar estado + Imprimir */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cambiar estado:</span>
                      {ESTADOS.map(e => (
                        <button key={e.value} onClick={() => handleEstadoChange(p.id, e.value)}
                          disabled={updatingId === p.id || p.estado_pedido === e.value}
                          style={{ padding: '0.3rem 0.65rem', borderRadius: 8, border: `1.5px solid ${(p.estado_pedido || 'pendiente') === e.value ? e.color : '#e5e7eb'}`, background: (p.estado_pedido || 'pendiente') === e.value ? e.bg : 'white', color: (p.estado_pedido || 'pendiente') === e.value ? e.color : '#6b7280', fontSize: '0.75rem', fontWeight: 600, cursor: (p.estado_pedido || 'pendiente') === e.value ? 'default' : 'pointer', opacity: updatingId === p.id ? 0.5 : 1 }}>
                          {e.label}
                        </button>
                      ))}
                      <button onClick={(ev) => { ev.stopPropagation(); abrirEnPOS(p); }}
                        style={{ marginLeft: 'auto', padding: '0.3rem 0.75rem', borderRadius: 8, border: '1.5px solid #10b981', background: '#f0fdf4', color: '#065f46', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ShoppingCart size={13} /> Abrir en POS
                      </button>
                      <button onClick={(ev) => { ev.stopPropagation(); imprimirPedido(p, printConfig); }}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Printer size={13} /> Imprimir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
            <PaginationView currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={15} onPageChange={p => { setPage(p); }} itemName="pedidos" />
          </div>
        </>
      )}
    </div>
  );
};

// ── Tab Configuración ────────────────────────────────────────────────────────

const TabConfiguracion = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tiendaActiva, setTiendaActiva] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [horario, setHorario] = useState('');
  const [envioActivo, setEnvioActivo] = useState(true);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [retiroActivo, setRetiroActivo] = useState(true);
  const [montoMinimo, setMontoMinimo] = useState(0);

  useEffect(() => {
    axios.get(`${API}/config`)
      .then(res => {
        const d = res.data;
        setTiendaActiva(d.tienda_activa !== false);
        setDescripcion(d.tienda_descripcion || '');
        setHorario(d.tienda_horario || '');
        setEnvioActivo(d.tienda_envio_activo !== false);
        setCostoEnvio(d.tienda_costo_envio || 0);
        setRetiroActivo(d.tienda_retiro_activo !== false);
        setMontoMinimo(d.tienda_monto_minimo || 0);
      })
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/config`, {
        tienda_activa: tiendaActiva,
        tienda_descripcion: descripcion,
        tienda_horario: horario,
        tienda_envio_activo: envioActivo,
        tienda_costo_envio: parseFloat(costoEnvio) || 0,
        tienda_retiro_activo: retiroActivo,
        tienda_monto_minimo: parseFloat(montoMinimo) || 0,
      });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-green-600" /></div>;

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Estado tienda */}
      <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Tienda activa</p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Cuando está desactivada los clientes ven un mensaje de "tienda cerrada"</p>
          </div>
          <button type="button" onClick={() => setTiendaActiva(!tiendaActiva)}
            style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: tiendaActiva ? 'var(--primary,#10b981)' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: tiendaActiva ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      </div>

      {/* Descripción y horario */}
      <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Descripción de la tienda</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
            placeholder="Ej: Productos frescos con entrega a domicilio"
            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Horario de atención</label>
          <input type="text" className="form-input" value={horario} onChange={e => setHorario(e.target.value)}
            placeholder="Ej: Lunes a Sábados de 9:00 a 20:00" />
        </div>
      </div>

      {/* Opciones de entrega */}
      <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>Opciones de entrega</p>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button type="button" onClick={() => setEnvioActivo(!envioActivo)}
            style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: envioActivo ? 'var(--primary,#10b981)' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0, marginTop: 2 }}>
            <span style={{ position: 'absolute', top: 2, left: envioActivo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 4px', fontSize: '0.9rem' }}>Envío a domicilio</p>
            {envioActivo && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Costo de envío</label>
                <input type="number" className="form-input" value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} min={0} step={1} placeholder="0 = envío gratis" />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => setRetiroActivo(!retiroActivo)}
            style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: retiroActivo ? 'var(--primary,#10b981)' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: retiroActivo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
          <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.9rem' }}>Retiro en local</p>
        </div>
      </div>

      {/* Monto mínimo */}
      <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Monto mínimo de pedido</label>
          <input type="number" className="form-input" value={montoMinimo} onChange={e => setMontoMinimo(e.target.value)} min={0} step={1} placeholder="0 = sin mínimo" />
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>Dejá en 0 para no aplicar mínimo.</p>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? <><div className="spinner" />Guardando...</> : 'Guardar configuración'}
      </button>
    </form>
  );
};

// ── Modal QR ─────────────────────────────────────────────────────────────────

const buildQRWithLogo = async (url, logoSrc) => {
  const size = 300;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  await QRCode.toCanvas(canvas, url, {
    width: size, margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#111827', light: '#ffffff' },
  });
  if (logoSrc) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = logoSrc;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    const logoSize = Math.round(size * 0.22);
    const pad = 6;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
    ctx.drawImage(img, x, y, logoSize, logoSize);
  }
  return canvas.toDataURL('image/png');
};

const ModalQR = ({ url, nombre, logo, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    buildQRWithLogo(url, logo || null).then(setQrDataUrl).catch(() => {});
  }, [url, logo]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Habilitá las ventanas emergentes para imprimir'); return; }
    const logoHtml = logo
      ? `<img class="logo" src="${logo}" alt="logo" />`
      : nombre ? `<div class="logo-text">${nombre}</div>` : '';
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QR Tienda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
    .card { text-align: center; padding: 40px 40px 48px; border: 3px solid #111827; border-radius: 20px; max-width: 380px; width: 100%; }
    .logo { max-width: 160px; max-height: 80px; object-fit: contain; margin-bottom: 18px; display: block; margin-left: auto; margin-right: auto; }
    .logo-text { font-size: 1.4rem; font-weight: 900; color: #111827; margin-bottom: 18px; }
    .divider { width: 48px; height: 3px; background: #10b981; border-radius: 2px; margin: 0 auto 20px; }
    .title { font-size: 1.6rem; font-weight: 900; color: #111827; line-height: 1.2; margin-bottom: 6px; }
    .subtitle { font-size: 1.2rem; font-weight: 700; color: #10b981; margin-bottom: 28px; }
    .qr { width: 240px; height: 240px; display: block; margin: 0 auto; }
    .hint { margin-top: 20px; font-size: 0.85rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    ${logoHtml}
    ${logoHtml ? '<div class="divider"></div>' : ''}
    <div class="title">¡Hacemos Envíos!</div>
    <div class="subtitle">Comprá desde tu casa.</div>
    <img class="qr" src="${qrDataUrl}" alt="QR" />
    <div class="hint">Escaneá el código con tu celular</div>
  </div>
</body>
</html>`);
    win.document.close();
    win.onafterprint = () => win.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 20, padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', margin: 0 }}>QR de tu tienda</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        {qrDataUrl
          ? <img src={qrDataUrl} alt="QR tienda" style={{ width: 240, height: 240, borderRadius: 12, border: '1.5px solid #e5e7eb', display: 'block', margin: '0 auto' }} />
          : <div style={{ width: 240, height: 240, margin: '0 auto', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Generando…</div>
        }

        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.75rem 0 1.25rem' }}>
          Tus clientes escanean este código para ir directo a tu tienda.
        </p>

        <button
          onClick={handlePrint}
          disabled={!qrDataUrl}
          style={{ width: '100%', background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem', fontWeight: 700, fontSize: '0.95rem', cursor: qrDataUrl ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: qrDataUrl ? 1 : 0.5 }}
        >
          <Printer size={16} /> Imprimir cartel
        </button>
      </div>
    </div>
  );
};

// ── Tab Mi Tienda ────────────────────────────────────────────────────────────

const TabMiTienda = ({ user }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [nombre, setNombre] = useState('');
  const [logo, setLogo] = useState('');
  const empresaId = user?.empresa_id;
  const tiendaUrl = `${FRONTEND_URL}/tienda/${empresaId}`;

  useEffect(() => {
    axios.get(`${API}/config`)
      .then(res => {
        setNombre(res.data.company_name || '');
        setLogo(res.data.company_logo || '');
      })
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(tiendaUrl).then(() => {
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {showQR && <ModalQR url={tiendaUrl} nombre={nombre} logo={logo} onClose={() => setShowQR(false)} />}

      <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1.5px solid #e5e7eb', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, color: '#111827', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link size={16} /> URL de tu tienda
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem' }}>Compartí este enlace con tus clientes para que puedan hacer pedidos.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: '0.65rem 0.85rem', border: '1.5px solid #e5e7eb' }}>
          <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151', wordBreak: 'break-all', userSelect: 'all' }}>{tiendaUrl}</span>
          <button onClick={handleCopy}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={tiendaUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary,#10b981)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            <ExternalLink size={14} /> Abrir tienda en nueva pestaña
          </a>
          <button
            onClick={() => setShowQR(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111827', color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <QrCode size={14} /> Ver QR
          </button>
        </div>
      </div>

      <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #bbf7d0' }}>
        <p style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Consejos</p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#166534', lineHeight: 1.7 }}>
          <li>Compartí el enlace en tus redes sociales y grupos de WhatsApp.</li>
          <li>Los pedidos llegan a la pestaña "Pedidos" en tiempo real.</li>
          <li>Cuando un cliente hace un pedido recibís una notificación.</li>
        </ul>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const TABS = [
  { id: 'pedidos',       label: 'Pedidos',        icon: ShoppingBag },
  { id: 'configuracion', label: 'Configuración',   icon: Settings },
  { id: 'mi-tienda',     label: 'Mi Tienda',       icon: Link },
];

const TiendaAdmin = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [tabActiva, setTabActiva] = useState('pedidos');
  const expandPedidoId = location.state?.expandPedidoId || null;

  return (
    <div>
      {/* Tabs — igual que Reports.js */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTabActiva(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                tabActiva === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {tabActiva === 'pedidos'       && <TabPedidos initialExpandId={expandPedidoId} />}
        {tabActiva === 'configuracion' && <TabConfiguracion />}
        {tabActiva === 'mi-tienda'     && <TabMiTienda user={user} />}
      </div>
    </div>
  );
};

export default TiendaAdmin;
