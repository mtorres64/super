import jsPDF from 'jspdf';
import { formatAmount, parseApiDate } from '../lib/utils';

const TIPO_CBTE_NOMBRES = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' };
const TIPO_CBTE_LETRA   = { 1: 'A', 6: 'B', 11: 'C' };
const CONDICIONES_IVA   = {
  consumidor_final:      'Consumidor Final',
  responsable_inscripto: 'Responsable Inscripto',
  monotributista:        'Monotributista',
  exento:                'Exento',
};

const fmtVencCAE = (v) =>
  v ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}` : '';

export function printDocumentA4(sale, {
  config    = {},
  afipConfig = {},
  cajeroName = '',
  customer   = null,
  returns    = [],
} = {}) {
  if (!sale) return;

  const sym          = config.currency_symbol || '$';
  const isAfipFact   = sale.afip_estado === 'autorizado' && sale.tipo_comprobante;
  const letraComp    = TIPO_CBTE_LETRA[sale.tipo_comprobante] || '';
  const isTienda     = sale.numero_factura?.startsWith('T-');
  const totalReturns = returns.reduce((s, r) => s + r.total, 0);
  const netSubtotal  = sale.subtotal - totalReturns;
  const pct          = (config.payment_method_adjustments || {})[sale.metodo_pago] ?? 0;
  const storedAdj    = sale.total - sale.subtotal - (sale.impuestos || 0);
  const netAdj       = totalReturns > 0 ? (netSubtotal * pct / 100) : storedAdj;
  const netTotal     = netSubtotal + (sale.impuestos || 0) + netAdj;

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W      = 210;
  const margin = 15;
  const right  = W - margin;
  let y        = 0;

  const hline = (y1, rgb = [200, 200, 200]) => {
    pdf.setDrawColor(...rgb);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y1, right, y1);
  };

  const checkY = (needed = 10) => {
    if (y + needed > 280) { pdf.addPage(); y = 20; }
  };

  // ── ENCABEZADO ──────────────────────────────────────────────────
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, W, 34, 'F');
  pdf.setTextColor(255, 255, 255);

  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  pdf.text(config.company_name || 'Mi Empresa', margin, 13);

  const details = [];
  if (config.company_address) details.push(config.company_address);
  if (config.company_phone)   details.push(`Tel: ${config.company_phone}`);
  if (config.company_tax_id)  details.push(`CUIT: ${config.company_tax_id}`);
  if (afipConfig?.condicion_iva_emisor) details.push(afipConfig.condicion_iva_emisor);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  if (details.length) pdf.text(details.join('   |   '), margin, 22);

  pdf.setTextColor(0, 0, 0);
  y = 42;

  // ── TIPO DE DOCUMENTO ────────────────────────────────────────────
  let docTitle = 'RECIBO';
  if (sale._esPresupuesto)  docTitle = 'PRESUPUESTO';
  else if (isAfipFact)      docTitle = TIPO_CBTE_NOMBRES[sale.tipo_comprobante] || 'FACTURA';

  if (isAfipFact) {
    // Layout: Pto.Vta — [LETRA] — Nro
    const boxX = W / 2 - 7;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.8);
    pdf.rect(boxX, y - 8, 14, 14);
    pdf.setLineWidth(0.2);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(letraComp, W / 2, y + 2, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Pto.Vta', margin, y - 4);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(afipConfig?.punto_venta || 1).padStart(4, '0'), margin, y + 2);

    pdf.setFont('helvetica', 'normal');
    pdf.text('Nro', right, y - 4, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(sale.nro_comprobante_afip || 0).padStart(8, '0'), right, y + 2, { align: 'right' });

    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(docTitle, W / 2, y, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('ORIGINAL', W / 2, y + 5, { align: 'center' });
    y += 12;
  } else {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(docTitle, W / 2, y, { align: 'center' });
    if (!sale._esPresupuesto && sale.numero_factura) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(sale.numero_factura, W / 2, y + 7, { align: 'center' });
      y += 14;
    } else {
      y += 10;
    }
  }

  hline(y); y += 5;

  // ── INFO GENERAL ─────────────────────────────────────────────────
  const halfW  = (right - margin) / 2;
  const midX   = margin + halfW;
  const infoR  = (label, value, lx, rx) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, lx, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '-', rx, y, { align: 'right' });
  };

  const fechaStr = sale.fecha ? parseApiDate(sale.fecha).toLocaleString('es-AR') : '-';
  infoR('Fecha:', fechaStr, margin, midX - 2);
  if (cajeroName) infoR('Cajero:', cajeroName, midX + 2, right);
  y += 6;

  const metodoPagoLabel = sale.metodo_pago === 'efectivo' ? 'Efectivo'
    : sale.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Transferencia';
  infoR('Método de pago:', metodoPagoLabel, margin, midX - 2);
  if (isTienda) {
    infoR('Pedido tienda:', `#${sale.numero_factura}`, midX + 2, right);
  }
  y += 8;

  // ── DATOS DEL CLIENTE ────────────────────────────────────────────
  if (customer || sale.cuit_receptor || (sale._esPresupuesto && customer)) {
    hline(y, [220, 220, 220]); y += 4;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('DATOS DEL CLIENTE', margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;
    pdf.setFont('helvetica', 'normal');

    if (customer?.nombre) {
      pdf.setFontSize(9);
      pdf.text(customer.nombre, margin, y); y += 5;
    }
    if (customer?.documento) {
      pdf.setFontSize(9);
      pdf.text(`${(customer.tipo_documento || 'DNI').toUpperCase()}: ${customer.documento}`, margin, y); y += 5;
    }
    if (sale.cuit_receptor) {
      pdf.setFontSize(9);
      pdf.text(`CUIT: ${sale.cuit_receptor}`, margin, y); y += 5;
    }
    if (customer?.direccion) {
      pdf.setFontSize(9);
      pdf.text(`Domicilio: ${customer.direccion}`, margin, y); y += 5;
    }
    if (isAfipFact) {
      pdf.setFontSize(9);
      pdf.text(`Cond. IVA: ${CONDICIONES_IVA[sale.condicion_iva_receptor] || 'Consumidor Final'}`, margin, y); y += 5;
    }
    if (customer?.telefono) {
      pdf.setFontSize(9);
      pdf.text(`Tel: ${customer.telefono}`, margin, y); y += 5;
    }
    y += 2;
  }

  // ── TABLA DE ITEMS ───────────────────────────────────────────────
  checkY(15);
  hline(y, [80, 80, 80]); y += 2;

  pdf.setFillColor(40, 40, 40);
  pdf.rect(margin, y, right - margin, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PRODUCTO',   margin + 2,   y + 5);
  pdf.text('CANT.',      margin + 100, y + 5, { align: 'right' });
  pdf.text('P.UNIT.',    margin + 135, y + 5, { align: 'right' });
  pdf.text('TOTAL',      right - 2,    y + 5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  sale.items.forEach((item, i) => {
    checkY(7);
    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(margin, y - 1, right - margin, 7, 'F');
    }
    pdf.setFontSize(8);
    const nameLines = pdf.splitTextToSize(item.nombre, 94);
    pdf.text(nameLines[0], margin + 2, y + 4);
    pdf.text(String(item.cantidad),                           margin + 100, y + 4, { align: 'right' });
    pdf.text(`${sym}${formatAmount(item.precio_unitario)}`,   margin + 135, y + 4, { align: 'right' });
    pdf.text(`${sym}${formatAmount(item.subtotal)}`,          right - 2,    y + 4, { align: 'right' });
    y += 7;
  });

  // Devoluciones
  if (returns.length > 0) {
    checkY(10);
    y += 2;
    pdf.setFillColor(255, 243, 200);
    pdf.rect(margin, y - 1, right - margin, 7, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DEVOLUCIONES', margin + 2, y + 4);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    returns.forEach(ret => {
      ret.items.forEach(item => {
        checkY(7);
        const nombre = item.nombre
          || sale.items.find(si => si.producto_id === item.producto_id)?.nombre
          || String(item.producto_id);
        pdf.setTextColor(180, 90, 0);
        pdf.setFontSize(8);
        pdf.text(`↩ ${nombre}`,                            margin + 2,    y + 4);
        pdf.text(String(item.cantidad),                    margin + 100,  y + 4, { align: 'right' });
        pdf.text(`${sym}${formatAmount(item.precio_unitario)}`, margin + 135, y + 4, { align: 'right' });
        pdf.text(`-${sym}${formatAmount(item.subtotal)}`,  right - 2,    y + 4, { align: 'right' });
        y += 7;
        pdf.setTextColor(0, 0, 0);
      });
    });
  }

  hline(y, [80, 80, 80]); y += 5;

  // ── TOTALES ──────────────────────────────────────────────────────
  const totW    = 85;
  const totLeft = right - totW;

  const totRow = (label, value, bold = false, rgb = null) => {
    checkY(6);
    if (rgb) pdf.setTextColor(...rgb);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, totLeft, y);
    pdf.text(value, right - 2, y, { align: 'right' });
    if (rgb) pdf.setTextColor(0, 0, 0);
    y += 6;
  };

  totRow('Subtotal:', `${sym}${formatAmount(netSubtotal)}`);

  if (sale.impuestos > 0) {
    const pctStr = ((config.tax_rate ?? 0) * 100).toFixed(0);
    totRow(`Impuestos (${pctStr}%):`, `${sym}${formatAmount(sale.impuestos)}`);
  }

  if (Math.abs(netAdj) >= 0.001) {
    const adjLabel = pct < 0
      ? `Descuento efectivo (${Math.abs(pct)}%):`
      : `Recargo ${sale.metodo_pago} (${pct}%):`;
    totRow(adjLabel, `${netAdj < 0 ? '-' : '+'}${sym}${formatAmount(Math.abs(netAdj))}`,
      false, netAdj < 0 ? [22, 163, 74] : [220, 38, 38]);
  }

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.4);
  pdf.line(totLeft, y, right, y);
  pdf.setLineWidth(0.2);
  y += 4;

  checkY(10);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totLeft, y);
  pdf.text(`${sym}${formatAmount(Math.max(0, netTotal))}`, right - 2, y, { align: 'right' });
  y += 10;

  // ── CAE / ARCA ───────────────────────────────────────────────────
  if (sale.cae) {
    checkY(22);
    hline(y); y += 4;
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, right - margin, 18, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMPROBANTE AUTORIZADO POR ARCA', W / 2, y + 6, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(`CAE N°: ${sale.cae}`,                    margin + 2, y + 12);
    pdf.text(`Vto. CAE: ${fmtVencCAE(sale.cae_vencimiento)}`, right - 2, y + 12, { align: 'right' });
    y += 22;
  }

  if (sale.afip_estado === 'contingencia') {
    checkY(14);
    hline(y, [200, 140, 0]); y += 4;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 100, 0);
    pdf.text('COMPROBANTE EN CONTINGENCIA', W / 2, y + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    y += 14;
  }

  // ── PIE ──────────────────────────────────────────────────────────
  hline(y); y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(config.receipt_footer_text || '¡Gracias por su compra!', W / 2, y, { align: 'center' });

  // ── NÚMERO DE PÁGINA ─────────────────────────────────────────────
  const totalPages = pdf.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generado el ${new Date().toLocaleString('es-AR')}`, margin, 292);
    pdf.text(`Página ${p} de ${totalPages}`, right, 292, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  // Abrir el PDF en nueva pestaña para imprimir
  const blob = pdf.output('blob');
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function printRemitoA4(compra, { config = {}, sucursal = null, formatDate, formatMoney } = {}) {
  if (!compra) return;

  const items = compra.items.filter(it => it.descripcion);

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W      = 210;
  const margin = 15;
  const right  = W - margin;
  let y        = 0;

  const hline = (y1, rgb = [200, 200, 200]) => {
    pdf.setDrawColor(...rgb);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y1, right, y1);
  };

  const sectionTitle = (text, yPos) => {
    pdf.setFillColor(40, 40, 40);
    pdf.rect(margin, yPos, right - margin, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text, margin + 3, yPos + 5);
    pdf.setTextColor(0, 0, 0);
    return yPos + 10;
  };

  const checkY = (needed = 10) => {
    if (y + needed > 280) { pdf.addPage(); y = 20; }
  };

  // ── ENCABEZADO ──────────────────────────────────────────────────
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, W, 34, 'F');
  pdf.setTextColor(255, 255, 255);

  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  pdf.text(config.company_name || 'Mi Empresa', margin, 13);

  const details = [];
  if (config.company_address) details.push(config.company_address);
  if (config.company_phone)   details.push(`Tel: ${config.company_phone}`);
  if (config.company_tax_id)  details.push(`CUIT: ${config.company_tax_id}`);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  if (details.length) pdf.text(details.join('   |   '), margin, 22);

  pdf.setTextColor(0, 0, 0);
  y = 42;

  // ── TÍTULO ───────────────────────────────────────────────────────
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REMITO DE COMPRA', W / 2, y, { align: 'center' });
  y += 8;

  if (compra.numero_factura) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Factura N°: ${compra.numero_factura}`, W / 2, y, { align: 'center' });
    y += 7;
  }

  hline(y); y += 5;

  // ── INFO GENERAL ─────────────────────────────────────────────────
  const halfW = (right - margin) / 2;
  const midX  = margin + halfW;

  const infoR = (label, value, lx, rx) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, lx, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '-', rx, y, { align: 'right' });
  };

  infoR('Fecha:', formatDate ? formatDate(compra.fecha) : compra.fecha, margin, midX - 2);
  if (sucursal) infoR('Sucursal:', sucursal.nombre, midX + 2, right);
  y += 8;

  // ── PROVEEDOR ────────────────────────────────────────────────────
  if (compra.proveedor_nombre) {
    checkY(18);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, right - margin, 14, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('PROVEEDOR', margin + 3, y + 5);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(compra.proveedor_nombre, margin + 3, y + 11);
    y += 18;
  }

  // ── TABLA DE ITEMS ───────────────────────────────────────────────
  checkY(15);
  hline(y, [80, 80, 80]); y += 2;

  pdf.setFillColor(40, 40, 40);
  pdf.rect(margin, y, right - margin, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESCRIPCIÓN',  margin + 2,    y + 5);
  pdf.text('CANTIDAD',     margin + 105,  y + 5, { align: 'right' });
  pdf.text('COSTO UNIT.',  margin + 140,  y + 5, { align: 'right' });
  pdf.text('SUBTOTAL',     right - 2,     y + 5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  items.forEach((item, i) => {
    checkY(7);
    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(margin, y - 1, right - margin, 7, 'F');
    }
    pdf.setFontSize(8);
    const nameLines = pdf.splitTextToSize(item.descripcion, 99);
    pdf.text(nameLines[0], margin + 2, y + 4);
    pdf.text(
      Number(item.cantidad).toLocaleString('es-AR'),
      margin + 105, y + 4, { align: 'right' }
    );
    pdf.text(
      `$ ${formatMoney ? formatMoney(item.precio_unitario) : formatAmount(item.precio_unitario)}`,
      margin + 140, y + 4, { align: 'right' }
    );
    pdf.text(
      `$ ${formatMoney ? formatMoney(item.subtotal) : formatAmount(item.subtotal)}`,
      right - 2, y + 4, { align: 'right' }
    );
    y += 7;
  });

  hline(y, [80, 80, 80]); y += 5;

  // ── TOTALES ──────────────────────────────────────────────────────
  const totW    = 85;
  const totLeft = right - totW;

  const totRow = (label, value, bold = false) => {
    checkY(6);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, totLeft, y);
    pdf.text(value, right - 2, y, { align: 'right' });
    y += 6;
  };

  const fmt = (v) => `$ ${formatMoney ? formatMoney(v) : formatAmount(v)}`;

  totRow('Subtotal:', fmt(compra.subtotal));
  if (compra.impuestos > 0) totRow('Impuestos / IVA:', fmt(compra.impuestos));

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.4);
  pdf.line(totLeft, y, right, y);
  pdf.setLineWidth(0.2);
  y += 4;

  checkY(10);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totLeft, y);
  pdf.text(fmt(compra.total), right - 2, y, { align: 'right' });
  y += 12;

  // ── NOTAS ────────────────────────────────────────────────────────
  if (compra.notas) {
    checkY(14);
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, margin, y + 10);
    pdf.setLineWidth(0.2);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Notas:', margin + 3, y + 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const notaLines = pdf.splitTextToSize(compra.notas, right - margin - 6);
    pdf.text(notaLines, margin + 3, y + 9);
    y += 8 + notaLines.length * 5;
  }

  // ── FIRMAS ───────────────────────────────────────────────────────
  const firmaY = Math.max(y + 20, 240);
  if (firmaY < 275) {
    const firmas = ['Firma del proveedor', 'Sello del proveedor', 'Recibido por'];
    const fw = (right - margin) / firmas.length;
    firmas.forEach((label, i) => {
      const cx = margin + fw * i + fw / 2;
      pdf.setDrawColor(120);
      pdf.setLineWidth(0.4);
      pdf.line(cx - 25, firmaY, cx + 25, firmaY);
      pdf.setLineWidth(0.2);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(label, cx, firmaY + 5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
    });
  }

  // ── NÚMERO DE PÁGINA ─────────────────────────────────────────────
  const totalPages = pdf.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generado el ${new Date().toLocaleString('es-AR')}`, margin, 292);
    pdf.text(`Página ${p} de ${totalPages}`, right, 292, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  const blob = pdf.output('blob');
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
