import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import CuentaView from './CuentaView';
import { useSortableData } from '../../hooks/useSortableData';

const STATUS_CONFIG = {
  trial:      { label: 'Período de Prueba', color: 'bg-blue-100 text-blue-800',   icon: Clock        },
  activa:     { label: 'Activa',            color: 'bg-green-100 text-green-800', icon: CheckCircle  },
  vencida:    { label: 'Vencida',           color: 'bg-red-100 text-red-800',     icon: XCircle      },
  suspendida: { label: 'Suspendida',        color: 'bg-gray-100 text-gray-700',   icon: AlertCircle  },
};

const PAGO_ESTADO_CONFIG = {
  approved:  { label: 'Aprobado',   color: 'bg-green-100 text-green-800' },
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800' },
  rejected:  { label: 'Rechazado',  color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelado',  color: 'bg-gray-100 text-gray-700' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const datePart = String(dateStr).slice(0, 10);
  const [y, m, day] = datePart.split('-');
  return `${day}/${m}/${y}`;
};

const formatCurrency = (amount, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

const Cuenta = () => {
  const { refreshSuscripcion } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [suscripcion, setSuscripcion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [planes, setPlanes] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [creandoPago, setCreandoPago] = useState(null);
  const [gestionandoAuto, setGestionandoAuto] = useState(false);
  const [descargandoRecibo, setDescargandoRecibo] = useState(null);

  const [whatsappNumero, setWhatsappNumero] = useState(null);

  useEffect(() => {
    fetchStatus();
    fetchPagos();
    axios.get(`${API}/cuenta/planes`).then(r => {
      setPlanes(r.data);
      if (r.data.whatsapp_numero) setWhatsappNumero(r.data.whatsapp_numero);
    }).catch(() => {});
  }, []);

  // Manejar retorno desde MercadoPago
  useEffect(() => {
    const pagoResult = searchParams.get('pago');
    const suscripcionResult = searchParams.get('suscripcion');
    if (pagoResult === 'success') {
      toast.success('¡Pago procesado correctamente! Tu suscripción fue actualizada.');
      fetchStatus();
      fetchPagos();
      refreshSuscripcion();
      setSearchParams({});
    } else if (pagoResult === 'failure') {
      toast.error('El pago no pudo completarse. Podés intentarlo nuevamente.');
      setSearchParams({});
    } else if (pagoResult === 'pending') {
      toast.info('Tu pago está siendo procesado. Te notificaremos cuando se acredite.');
      setSearchParams({});
    } else if (suscripcionResult === 'authorized') {
      toast.success('¡Débito automático activado! A partir del próximo ciclo se cobrará automáticamente.');
      fetchStatus();
      fetchPagos();
      refreshSuscripcion();
      setSearchParams({});
    } else if (suscripcionResult === 'cancelled') {
      toast.info('Proceso de suscripción automática cancelado.');
      setSearchParams({});
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const resp = await axios.get(`${API}/cuenta/status`);
      setSuscripcion(resp.data);
    } catch (err) {
      toast.error('Error al cargar el estado de la suscripción');
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchPagos = async () => {
    try {
      setLoadingPagos(true);
      const resp = await axios.get(`${API}/cuenta/pagos`);
      setPagos(resp.data);
    } catch (err) {
      // silencioso si no hay pagos
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleSimularPago = async (planTipo = 'mensual') => {
    try {
      await axios.post(`${API}/cuenta/pago/simular-aprobado?plan_tipo=${planTipo}`);
      const label = planTipo === 'anual' ? 'anual (12 meses)' : 'mensual (1 mes)';
      toast.success(`[TEST] Pago ${label} simulado. Suscripción renovada.`);
      fetchStatus();
      fetchPagos();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al simular pago');
    }
  };

  const handleActivarSuscripcionAuto = async () => {
    try {
      setGestionandoAuto('activando');
      const resp = await axios.post(`${API}/cuenta/suscripcion/activar`);
      const url = resp.data.init_point || resp.data.sandbox_init_point;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('No se pudo obtener el enlace de autorización');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al activar el débito automático';
      toast.error(msg);
    } finally {
      setGestionandoAuto(false);
    }
  };

  const handleCancelarSuscripcionAuto = async () => {
    if (!window.confirm('¿Cancelar el débito automático? Tu suscripción actual sigue vigente hasta su vencimiento.')) return;
    try {
      setGestionandoAuto('cancelando');
      await axios.post(`${API}/cuenta/suscripcion/cancelar`);
      toast.success('Débito automático cancelado. Tu suscripción sigue activa hasta su vencimiento.');
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al cancelar el débito automático';
      toast.error(msg);
    } finally {
      setGestionandoAuto(false);
    }
  };

  const handleDescargarRecibo = (pago) => {
    const empresaNombre = suscripcion?.empresa_nombre || '';
    const numSec = parseInt(pago.id.replace(/\D/g, '').slice(-8), 10) || 1;
    const numFormatted = `0001-${String(numSec).padStart(8, '0')}`;

    const fmtDate = (d) => {
      if (!d) return '-';
      const datePart = String(d).slice(0, 10);
      const [y, m, day] = datePart.split('-');
      return `${day}/${m}/${y}`;
    };
    const fmtCurrency = (amount, currency = 'ARS') =>
      new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

    const periodoTexto = pago.periodo_inicio && pago.periodo_fin
      ? `${fmtDate(pago.periodo_inicio)} al ${fmtDate(pago.periodo_fin)}`
      : '-';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${numFormatted}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo:wght@400;700;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { margin: 20mm 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #e5e7eb; padding: 20px; }
  .page { width: 794px; height: 1157px; display: flex; flex-direction: column; border: 1px solid #d1d5db; background: #fff; overflow: hidden; }

  /* BANDA SUPERIOR */
  .topbar { background: #16a34a; height: 6px; }

  /* CABECERA: 3 columnas */
  .cab { display: grid; grid-template-columns: 1fr 90px 1fr; border-bottom: 2px solid #16a34a; min-height: 120px; }
  .cab-izq { padding: 20px 28px; border-right: 1px solid #d1fae5; display: flex; flex-direction: column; justify-content: center; }
  .cab-izq .marca { font-family: 'Exo', Arial, sans-serif; font-size: 34px; font-weight: 900; letter-spacing: -1px; color: #16a34a; line-height: 1; }
  .cab-izq .marca-app { font-family: 'Exo', Arial, sans-serif; font-size: 12px; font-weight: 700; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
  .cab-izq .marca-sub { font-size: 10px; color: #9ca3af; margin-top: 6px; letter-spacing: 0.3px; }
  .cab-centro { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f0fdf4; border-right: 1px solid #d1fae5; border-left: 1px solid #d1fae5; padding: 8px 4px; }
  .cab-centro .letra { font-size: 56px; font-weight: 900; color: #16a34a; line-height: 1; }
  .cab-centro .letra-label { font-size: 8px; color: #6b7280; text-transform: uppercase; margin-top: 4px; text-align: center; }
  .cab-der { padding: 20px 28px; display: flex; flex-direction: column; justify-content: center; }
  .cab-der .doc-tipo { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #16a34a; text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #d1fae5; letter-spacing: 0.5px; }
  .cab-der table { width: 100%; font-size: 11px; }
  .cab-der td { padding: 3px 0; }
  .cab-der td:first-child { color: #6b7280; width: 40%; }
  .cab-der td:last-child { font-weight: 700; color: #111; }

  /* RECEPTOR */
  .receptor { border-bottom: 1px solid #e5e7eb; padding: 14px 28px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px 20px; background: #fafafa; }
  .receptor .campo { font-size: 10px; }
  .receptor .campo .etiq { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
  .receptor .campo strong { font-size: 12px; font-weight: 700; color: #111; }

  /* TABLA DE ÍTEMS */
  .items { }
  .items table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .items thead tr { background: #16a34a; }
  .items th { padding: 9px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #fff; font-weight: 700; }
  .items th.right, .items td.right { text-align: right; }
  .items tbody tr:nth-child(even) { background: #f9fafb; }
  .items td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #1a1a1a; }
  .items .desc-sub { font-size: 10px; color: #6b7280; margin-top: 3px; }

  .spacer { flex: 1; }

  /* INFO BLOQUE */
  .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
  .info-card { padding: 24px 28px; }
  .info-card:first-child { border-right: 1px solid #e5e7eb; }
  .info-card .titulo { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; margin-bottom: 10px; }
  .info-card .feature-list { list-style: none; }
  .info-card .feature-list li { font-size: 11px; color: #374151; padding: 2px 0; display: flex; align-items: center; gap: 6px; }
  .info-card .feature-list li::before { content: "✓"; color: #16a34a; font-weight: 900; font-size: 11px; }
  .info-card .dato { margin-bottom: 8px; }
  .info-card .dato .etiq { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; display: block; margin-bottom: 2px; }
  .info-card .dato strong { font-size: 13px; font-weight: 700; color: #111; }
  .info-card .dato .val { font-size: 12px; color: #374151; }
  .info-card .badge-plan { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .badge-emprendedor { background: #d1fae5; color: #065f46; }
  .badge-profesional  { background: #dbeafe; color: #1e40af; }
  .badge-empresarial  { background: #ede9fe; color: #5b21b6; }

  /* TOTALES */
  .totales-wrap { display: flex; justify-content: flex-end; border-top: 2px solid #16a34a; }
  .totales { font-size: 12px; min-width: 280px; border-left: 1px solid #e5e7eb; }
  .totales tr td { padding: 7px 16px; }
  .totales tr td:first-child { color: #6b7280; }
  .totales tr td:last-child { text-align: right; font-weight: 600; }
  .totales .total-final td { font-size: 15px; font-weight: 900; background: #16a34a; color: #fff; padding: 10px 16px; }

  /* FORMA DE PAGO */
  .pago-info { padding: 10px 28px; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; display: flex; gap: 40px; font-size: 11px; background: #f0fdf4; }
  .pago-info .etiq { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 1px; }
  .pago-info strong { color: #111; }

  /* TÉRMINOS */
  .terminos { padding: 16px 28px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: center; gap: 5px; }
  .terminos p { font-size: 8.5px; color: #9ca3af; line-height: 1.55; }
  .terminos p strong { color: #6b7280; font-weight: 700; }

  /* PIE */
  .footer { padding: 12px 28px; background: #16a34a; display: flex; justify-content: space-between; align-items: center; }
  .footer .footer-marca { font-family: 'Exo', Arial, sans-serif; font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -0.5px; line-height: 1; }
  .footer .footer-marca-app { font-family: 'Exo', Arial, sans-serif; font-size: 9px; font-weight: 700; color: #bbf7d0; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
  .footer .footer-legal { font-size: 9px; color: #bbf7d0; text-align: right; line-height: 1.5; }

  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { min-height: 100vh; border: none; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="topbar"></div>

  <!-- CABECERA -->
  <div class="cab">
    <div class="cab-izq">
      <div class="marca">PULS</div>
      <div class="marca-app">Market App</div>
      <div class="marca-sub">Sistema de control de stock</div>
    </div>
    <div class="cab-centro">
      <div class="letra">X</div>
      <div class="letra-label">Cod. 00</div>
    </div>
    <div class="cab-der">
      <div class="doc-tipo">Comprobante de Pago</div>
      <table>
        <tr><td>N°:</td><td>${numFormatted}</td></tr>
        <tr><td>Fecha:</td><td>${fmtDate(pago.fecha)}</td></tr>
        <tr><td>Moneda:</td><td>${pago.moneda || 'ARS'}</td></tr>
      </table>
    </div>
  </div>

  <!-- RECEPTOR -->
  <div class="receptor">
    <div class="campo">
      <span class="etiq">Cliente</span>
      <strong>${empresaNombre || '-'}</strong>
    </div>
    <div class="campo">
      <span class="etiq">Período facturado</span>
      <strong>${periodoTexto}</strong>
    </div>
    <div class="campo">
      <span class="etiq">Estado</span>
      <strong>Pagado</strong>
    </div>
  </div>

  <!-- TABLA ÍTEMS -->
  <div class="items">
    <table>
      <thead>
        <tr>
          <th style="width:60px">Cant.</th>
          <th>Descripción</th>
          <th class="right" style="width:150px">Precio Unit.</th>
          <th class="right" style="width:150px">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:center">1</td>
          <td>
            ${pago.concepto}
            ${pago.periodo_inicio && pago.periodo_fin
              ? `<div class="desc-sub">Período: ${periodoTexto}</div>`
              : ''}
          </td>
          <td class="right">${fmtCurrency(pago.monto, pago.moneda)}</td>
          <td class="right">${fmtCurrency(pago.monto, pago.moneda)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="spacer"></div>

  <!-- TOTALES -->
  <div class="totales-wrap">
    <table class="totales">
      <tr><td>Subtotal:</td><td>${fmtCurrency(pago.monto, pago.moneda)}</td></tr>
      <tr><td>IVA:</td><td>Incluido</td></tr>
      <tr class="total-final"><td>TOTAL:</td><td>${fmtCurrency(pago.monto, pago.moneda)}</td></tr>
    </table>
  </div>

  <!-- FORMA DE PAGO -->
  <div class="pago-info">
    <div>
      <span class="etiq">Forma de pago</span>
      <strong>MercadoPago</strong>
    </div>
    ${pago.mp_payment_id ? `<div><span class="etiq">ID transacción</span><strong>${pago.mp_payment_id}</strong></div>` : ''}
  </div>

  <!-- INFO BLOQUE -->
  ${(() => {
    const tierFeatures = {
      emprendedor: ['POS / Ventas', 'Caja', 'Inventario', 'Notificaciones'],
      profesional:  ['POS / Ventas', 'Caja', 'Inventario', 'Reportes de Ventas', 'Compras y Proveedores', 'Alertas de Stock', 'Usuarios y Roles'],
      empresarial:  ['POS / Ventas', 'Caja', 'Inventario', 'Reportes de Ventas', 'Compras y Proveedores', 'Alertas de Stock', 'Usuarios y Roles', 'Multi-sucursal'],
    };
    const tier = pago.plan_tier || 'profesional';
    const tierLabel = { emprendedor: 'Emprendedor', profesional: 'Profesional', empresarial: 'Empresarial' }[tier] || tier;
    const ciclo = pago.plan_tipo === 'anual' ? 'Anual (12 meses)' : 'Mensual';
    const features = tierFeatures[tier] || [];
    const featuresHtml = features.map(f => `<li>${f}</li>`).join('');
    const vencimiento = pago.periodo_fin ? fmtDate(pago.periodo_fin) : '-';
    const proximaRenovacion = pago.periodo_fin ? fmtDate(pago.periodo_fin) : '-';
    return `
  <div class="info-section">
    <div class="info-card">
      <div class="titulo">Detalle del plan</div>
      <span class="badge-plan badge-${tier}">${tierLabel}</span>
      <ul class="feature-list">${featuresHtml}</ul>
    </div>
    <div class="info-card">
      <div class="titulo">Información de facturación</div>
      <div class="dato">
        <span class="etiq">Ciclo de facturación</span>
        <div class="val">${ciclo}</div>
      </div>
      <div class="dato">
        <span class="etiq">Vigencia desde</span>
        <div class="val">${fmtDate(pago.periodo_inicio)}</div>
      </div>
      <div class="dato">
        <span class="etiq">Vigencia hasta</span>
        <strong>${vencimiento}</strong>
      </div>
      <div class="dato">
        <span class="etiq">Próxima renovación</span>
        <div class="val">${proximaRenovacion}</div>
      </div>
    </div>
  </div>`;
  })()}

  <!-- TÉRMINOS -->
  <div class="terminos">
    <p><strong>Validez del comprobante.</strong> Este documento es un resguardo interno de pago emitido por PULS Market App y no constituye una factura con validez fiscal ante la AFIP ni ningún organismo recaudador nacional o provincial. Para obtener una factura oficial, el emisor deberá solicitarla por los canales habilitados.</p>
    <p><strong>Servicio y vigencia.</strong> El acceso al plan contratado se mantiene activo durante el período indicado en este comprobante, sujeto al cumplimiento de los Términos y Condiciones de uso de PULS Market App. El servicio se presta en modo SaaS y puede estar sujeto a interrupciones programadas de mantenimiento.</p>
    <p><strong>Precios y modificaciones.</strong> Los precios de los planes pueden actualizarse con un preaviso mínimo de 30 días corridos. El monto consignado en este comprobante corresponde exclusivamente al período facturado y no implica garantía de precio para períodos futuros.</p>
    <p><strong>Responsabilidad limitada.</strong> PULS Market App no se responsabiliza por pérdidas de datos, lucro cesante ni daños indirectos derivados del uso o la imposibilidad de uso del servicio, salvo los casos expresamente previstos en la legislación argentina aplicable (Ley 24.240 y normas concordantes).</p>
    <p><strong>Contacto y reclamos.</strong> Ante cualquier discrepancia con los montos, períodos o estados de pago, el titular deberá comunicarse dentro de los 15 días corridos posteriores a la fecha de emisión de este comprobante a través de los canales oficiales de soporte de PULS Market App.</p>
  </div>

  <!-- PIE -->
  <div class="footer">
    <div>
      <div class="footer-marca">PULS</div>
      <div class="footer-marca-app">Market App</div>
    </div>
    <div class="footer-legal">
      Este comprobante no tiene validez fiscal como factura oficial AFIP.<br>
      Es un resguardo interno de pago emitido por PULS &mdash; Sistema de control de stock.
    </div>
  </div>

</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
window.addEventListener('load', async () => {
  await new Promise(r => setTimeout(r, 1200));
  const { jsPDF } = window.jspdf;
  const page = document.querySelector('.page');
  const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 277);
  pdf.save('Comprobante-${numFormatted}.pdf');
  window.parent.postMessage({ type: 'recibo-done' }, '*');
});
</script>
</body>
</html>`;

    setDescargandoRecibo(pago.id);

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed', top: '-9999px', left: '-9999px',
      width: '834px', height: '1200px', border: 'none', visibility: 'hidden',
    });
    document.body.appendChild(iframe);

    const handleMessage = (e) => {
      if (e.data?.type === 'recibo-done') {
        window.removeEventListener('message', handleMessage);
        document.body.removeChild(iframe);
        setDescargandoRecibo(null);
      }
    };
    window.addEventListener('message', handleMessage);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  };

  const handlePagar = async (planTipo = 'mensual', planTier = 'profesional', addons = {}) => {
    const key = `${planTier}-${planTipo}`;
    try {
      setCreandoPago(key);
      const resp = await axios.post(`${API}/cuenta/pago/crear`, {
        plan_tipo: planTipo,
        plan_tier: planTier,
        addon_tienda: addons.addonTienda || false,
        sucursales_extra: addons.sucursalesExtra || 0,
        usuarios_extra_packs: addons.usuariosExtraPacks || 0,
      });
      const url = resp.data.init_point || resp.data.sandbox_init_point;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('No se pudo obtener el enlace de pago');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar el pago';
      toast.error(msg);
    } finally {
      setCreandoPago(null);
    }
  };

  const statusNorm = suscripcion?.status?.toLowerCase();
  const enGracia = suscripcion?.en_gracia;
  const fuePagada = suscripcion?.fue_pagada;

  const statusConf = suscripcion
    ? (enGracia
        ? { label: 'En período de gracia', color: 'bg-amber-100 text-amber-800', icon: Clock }
        : (STATUS_CONFIG[suscripcion.status?.toLowerCase()] || STATUS_CONFIG.suspendida))
    : null;
  const showAlert = suscripcion && (
    statusNorm === 'vencida' ||
    enGracia ||
    (statusNorm !== 'suspendida' && statusNorm !== 'vencida' && suscripcion.dias_restantes <= 7)
  );

  const accionLabel = (statusNorm === 'vencida' || enGracia) ? 'Reactivar' : 'Renovar';

  const { sortedItems: sortedPagos, sortConfig, requestSort } = useSortableData(pagos);

  return (
    <CuentaView
      suscripcion={suscripcion}
      pagos={sortedPagos}
      sortConfig={sortConfig}
      requestSort={requestSort}
      planes={planes}
      loadingStatus={loadingStatus}
      loadingPagos={loadingPagos}
      creandoPago={creandoPago}
      gestionandoAuto={gestionandoAuto}
      whatsappNumero={whatsappNumero}
      statusNorm={statusNorm}
      enGracia={enGracia}
      fuePagada={fuePagada}
      statusConf={statusConf}
      showAlert={showAlert}
      accionLabel={accionLabel}
      PAGO_ESTADO_CONFIG={PAGO_ESTADO_CONFIG}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      onRefresh={() => { fetchStatus(); fetchPagos(); }}
      onPagar={handlePagar}
      onSimularPago={handleSimularPago}
      onActivarSuscripcionAuto={handleActivarSuscripcionAuto}
      onCancelarSuscripcionAuto={handleCancelarSuscripcionAuto}
      onDescargarRecibo={handleDescargarRecibo}
      descargandoRecibo={descargandoRecibo}
      suscripcionAddons={{
        addon_tienda: suscripcion?.addon_tienda || false,
        sucursales_extra: suscripcion?.sucursales_extra || 0,
        usuarios_extra_packs: suscripcion?.usuarios_extra_packs || 0,
      }}
    />
  );
};

export default Cuenta;
