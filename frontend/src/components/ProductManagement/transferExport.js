import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const money = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '';
  return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(iso); }
};

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');

const baseName = (t) =>
  `transferencia_${slug(t.sucursal_origen_nombre)}_a_${slug(t.sucursal_destino_nombre)}_${new Date().toISOString().split('T')[0]}`;

const flag = (it) => {
  const c = it.actualizo_costo ? 'C' : '';
  const p = it.actualizo_precio_venta ? 'P' : '';
  return [c, p].filter(Boolean).join('+') || '—';
};

// ── Excel ─────────────────────────────────────────────────────────────
export function exportTransferExcel(t) {
  const rows = (t.items || []).map((it) => ({
    Producto: it.nombre,
    'Código': it.codigo_barras || '',
    Cantidad: it.cantidad,
    'Costo origen': it.costo_origen,
    Subtotal: it.subtotal,
    'Actualiza costo': it.actualizo_costo ? 'Sí' : 'No',
    'Costo destino nuevo': it.actualizo_costo ? (it.costo_destino_nuevo ?? '') : '',
    'Actualiza precio venta': it.actualizo_precio_venta ? 'Sí' : 'No',
    'Precio venta destino': it.actualizo_precio_venta ? (it.precio_destino_nuevo ?? '') : '',
    'Margen destino %': it.margen_destino ?? '',
  }));
  rows.push({
    Producto: 'TOTAL',
    'Código': '',
    Cantidad: t.total_unidades,
    'Costo origen': '',
    Subtotal: t.total_valor,
    'Actualiza costo': '',
    'Costo destino nuevo': '',
    'Actualiza precio venta': '',
    'Precio venta destino': '',
    'Margen destino %': '',
  });

  const ws = XLSX.utils.aoa_to_sheet([
    ['Transferencia de stock entre sucursales'],
    ['Origen', t.sucursal_origen_nombre || ''],
    ['Destino', t.sucursal_destino_nombre || ''],
    ['Fecha', fmtFecha(t.fecha)],
    ['Registró', t.registrado_por_nombre || ''],
    ['Notas', t.notas || ''],
    ['Valor del movimiento (costo origen)', t.total_valor],
    [],
  ]);
  XLSX.utils.sheet_add_json(ws, rows, { origin: -1 });
  ws['!cols'] = [
    { wch: 34 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transferencia');
  XLSX.writeFile(wb, `${baseName(t)}.xlsx`);
}

// ── PDF (formato predefinido: banda oscura + secciones + tabla + pie) ──
export function exportTransferPdf(t) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 18;
  const colRight = W - margin;
  let y = 0;

  const line = (y1) => { pdf.setDrawColor(180); pdf.line(margin, y1, colRight, y1); };
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
    pdf.text(String(label), margin + 2, yPos);
    pdf.text(String(value), colRight - 2, yPos, { align: 'right' });
    return yPos + 6;
  };

  // Encabezado
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, W, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TRANSFERENCIA DE STOCK', W / 2, 13, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `${t.sucursal_origen_nombre || '-'}  →  ${t.sucursal_destino_nombre || '-'}   |   ${fmtFecha(t.fecha)}`,
    W / 2, 22, { align: 'center' },
  );
  pdf.setTextColor(0, 0, 0);
  y = 34;

  // Datos
  y = sectionTitle('DATOS', y);
  y = row('Sucursal origen', t.sucursal_origen_nombre || '-', y);
  y = row('Sucursal destino', t.sucursal_destino_nombre || '-', y);
  y = row('Fecha', fmtFecha(t.fecha), y);
  y = row('Registró', t.registrado_por_nombre || '-', y);
  if (t.notas) y = row('Notas', t.notas, y);
  y = row('Unidades', String(t.total_unidades ?? ''), y);
  y = row('Valor del movimiento (costo origen)', `$${money(t.total_valor)}`, y, true);
  y += 4;

  // Tabla de productos
  y = sectionTitle('PRODUCTOS', y);
  const cols = [
    { k: 'nombre', x: margin + 2, w: 55, align: 'left', h: 'Producto' },
    { k: 'cantidad', x: margin + 60, w: 12, align: 'center', h: 'Cant.' },
    { k: 'costo_origen', x: margin + 96, w: 22, align: 'right', h: 'C. origen' },
    { k: 'subtotal', x: margin + 122, w: 24, align: 'right', h: 'Subtotal' },
    { k: 'precio_destino_nuevo', x: margin + 152, w: 26, align: 'right', h: 'P. vta dest.' },
    { k: 'margen', x: colRight - 14, w: 14, align: 'right', h: 'Margen' },
    { k: 'flag', x: colRight, w: 10, align: 'right', h: 'Act.' },
  ];
  const drawHead = (yPos) => {
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, yPos, colRight - margin, 6, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    cols.forEach((c) => pdf.text(c.h, c.x, yPos + 4, c.align === 'left' ? undefined : { align: c.align }));
    return yPos + 7;
  };
  y = drawHead(y);
  pdf.setFont('helvetica', 'normal');

  (t.items || []).forEach((it, i) => {
    if (y > 270) { pdf.addPage(); y = 20; y = drawHead(y); pdf.setFont('helvetica', 'normal'); }
    if (i % 2 === 0) {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
    }
    pdf.setFontSize(7.5);
    const nombre = String(it.nombre || '');
    pdf.text(nombre.length > 34 ? `${nombre.slice(0, 33)}…` : nombre, cols[0].x, y + 3);
    pdf.text(String(it.cantidad ?? ''), cols[1].x, y + 3, { align: 'center' });
    pdf.text(`$${money(it.costo_origen)}`, cols[2].x, y + 3, { align: 'right' });
    pdf.text(`$${money(it.subtotal)}`, cols[3].x, y + 3, { align: 'right' });
    pdf.text(it.actualizo_precio_venta && it.precio_destino_nuevo != null ? `$${money(it.precio_destino_nuevo)}` : '—', cols[4].x, y + 3, { align: 'right' });
    pdf.text(it.margen_destino != null ? `${money(it.margen_destino)}%` : '—', cols[5].x, y + 3, { align: 'right' });
    pdf.text(flag(it), cols[6].x, y + 3, { align: 'right' });
    y += 6;
  });

  // Total
  if (y > 270) { pdf.addPage(); y = 20; }
  pdf.setDrawColor(150);
  pdf.line(margin, y, colRight, y);
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(`Unidades: ${t.total_unidades ?? ''}`, margin + 2, y);
  pdf.text(`Total (costo origen): $${money(t.total_valor)}`, colRight - 2, y, { align: 'right' });
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(120);
  pdf.text('Act.: C = pasó el costo al destino · P = actualizó el precio de venta en destino', margin + 2, y);
  pdf.setTextColor(0, 0, 0);

  // Pie de página
  const totalPages = pdf.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    line(285);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, 290);
    pdf.text(`Página ${p} de ${totalPages}`, colRight, 290, { align: 'right' });
  }

  pdf.save(`${baseName(t)}.pdf`);
}
