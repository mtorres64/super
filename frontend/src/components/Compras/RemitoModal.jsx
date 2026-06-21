import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { printRemitoA4 } from '../../utils/printA4';

const generateRemitoHTML = (compra, sucursal, formatDate, formatMoney, config = {}) => {
  const items = compra.items.filter(it => it.descripcion);
  const itemsHTML = items.map(item => `
    <tr>
      <td>${item.descripcion}</td>
      <td class="right">${Number(item.cantidad).toLocaleString('es-AR')}</td>
      <td class="right">$ ${formatMoney(item.precio_unitario)}</td>
      <td class="right">$ ${formatMoney(item.subtotal)}</td>
    </tr>
  `).join('');

  const impuestosRow = compra.impuestos > 0 ? `
    <div class="totals-row">
      <span>Impuestos / IVA:</span>
      <span>$ ${formatMoney(compra.impuestos)}</span>
    </div>
  ` : '';

  const proveedorSection = compra.proveedor_nombre ? `
    <div class="info-box">
      <div class="label">Proveedor</div>
      <div class="value">${compra.proveedor_nombre}</div>
    </div>
  ` : '';

  const notasSection = compra.notas ? `
    <div class="notas"><strong>Notas:</strong> ${compra.notas}</div>
  ` : '';

  const sucursalText = sucursal ? `<p><strong>Sucursal:</strong> ${sucursal.nombre}</p>` : '';

  const companyDetails = [
    config.company_address,
    config.company_phone ? `Tel: ${config.company_phone}` : null,
    config.company_tax_id ? `CUIT: ${config.company_tax_id}` : null,
  ].filter(Boolean).join('   |   ');

  const companyHeader = config.company_name ? `
  <div class="empresa-header">
    <div class="empresa-nombre">${config.company_name}</div>
    ${companyDetails ? `<div class="empresa-detalle">${companyDetails}</div>` : ''}
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Remito${compra.numero_factura ? ` - ${compra.numero_factura}` : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 28px; }
    h1 { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
    .empresa-header { background: #141414; color: #fff; padding: 14px 18px; margin-bottom: 18px; border-radius: 3px; }
    .empresa-nombre { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .empresa-detalle { font-size: 11px; color: #ccc; }
    .header { border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left h1 { margin-bottom: 4px; }
    .header-left p { color: #555; font-size: 13px; }
    .header-right { text-align: right; font-size: 13px; line-height: 1.6; }
    .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
    .info-box .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
    .info-box .value { font-weight: 700; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
    th.right, td.right { text-align: right; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .totals { margin-left: auto; width: 270px; border: 1px solid #ddd; border-radius: 4px; padding: 12px 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
    .totals-row.total { font-weight: bold; font-size: 15px; border-top: 1px solid #aaa; margin-top: 6px; padding-top: 8px; }
    .notas { border-left: 3px solid #ccc; padding-left: 10px; color: #555; font-size: 12px; margin: 18px 0; }
    .firma { margin-top: 56px; display: flex; justify-content: space-around; }
    .firma-box { text-align: center; width: 160px; }
    .firma-line { border-top: 1px solid #555; padding-top: 6px; font-size: 11px; color: #555; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  ${companyHeader}
  <div class="header">
    <div class="header-left">
      <h1>REMITO DE COMPRA</h1>
      ${compra.numero_factura ? `<p>Factura N°: <strong>${compra.numero_factura}</strong></p>` : ''}
    </div>
    <div class="header-right">
      <p><strong>Fecha:</strong> ${formatDate(compra.fecha)}</p>
      ${sucursalText}
    </div>
  </div>

  ${proveedorSection}

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="right" style="width:100px">Cantidad</th>
        <th class="right" style="width:140px">Costo Unit.</th>
        <th class="right" style="width:140px">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>$ ${formatMoney(compra.subtotal)}</span>
    </div>
    ${impuestosRow}
    <div class="totals-row total">
      <span>TOTAL:</span>
      <span>$ ${formatMoney(compra.total)}</span>
    </div>
  </div>

  ${notasSection}

  <div class="firma">
    <div class="firma-box">
      <div class="firma-line">Firma del proveedor</div>
    </div>
    <div class="firma-box">
      <div class="firma-line">Sello del proveedor</div>
    </div>
    <div class="firma-box">
      <div class="firma-line">Recibido por</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
};

const RemitoModal = ({ compra, branches, closing, onClose, formatDate, formatMoney, config = {} }) => {
  if (!compra) return null;

  const sucursal = branches?.find(b => b.id === compra.sucursal_id);
  const items = compra.items.filter(it => it.descripcion);

  const handlePrint = () => {
    printRemitoA4(compra, { config, sucursal, formatDate, formatMoney });
  };

  return (
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div
        className={`modal-content${closing ? ' closing' : ''}`}
        style={{ maxWidth: '700px', width: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Remito de Compra
          </h2>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {/* Preview del remito */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Encabezado */}
            <div className="flex justify-between items-start pb-4 mb-5 border-b-2 border-gray-800">
              <div>
                <h3 className="text-xl font-bold tracking-wide text-gray-900">REMITO DE COMPRA</h3>
                {compra.numero_factura && (
                  <p className="text-gray-500 text-xs mt-1">Factura N°: <strong className="text-gray-700">{compra.numero_factura}</strong></p>
                )}
              </div>
              <div className="text-right text-xs text-gray-600 leading-relaxed">
                <p><span className="font-semibold">Fecha:</span> {formatDate(compra.fecha)}</p>
                {sucursal && <p><span className="font-semibold">Sucursal:</span> {sucursal.nombre}</p>}
              </div>
            </div>

            {/* Proveedor */}
            {compra.proveedor_nombre && (
              <div className="border border-gray-200 rounded p-3 mb-5">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Proveedor</div>
                <div className="font-bold text-base text-gray-900">{compra.proveedor_nombre}</div>
              </div>
            )}

            {/* Tabla de items */}
            <table className="w-full mb-5" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-gray-600 border-b border-gray-300">Descripción</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-600 border-b border-gray-300" style={{ width: '90px' }}>Cantidad</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-600 border-b border-gray-300" style={{ width: '120px' }}>Costo Unit.</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-gray-600 border-b border-gray-300" style={{ width: '120px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td className="px-2 py-2 text-gray-800">{item.descripcion}</td>
                    <td className="px-2 py-2 text-right text-gray-700">{Number(item.cantidad).toLocaleString('es-AR')}</td>
                    <td className="px-2 py-2 text-right text-gray-700">$ {formatMoney(item.precio_unitario)}</td>
                    <td className="px-2 py-2 text-right text-gray-700">$ {formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="ml-auto border border-gray-200 rounded p-3" style={{ width: '260px' }}>
              <div className="flex justify-between py-1 text-gray-700">
                <span>Subtotal:</span>
                <span>$ {formatMoney(compra.subtotal)}</span>
              </div>
              {compra.impuestos > 0 && (
                <div className="flex justify-between py-1 text-gray-700">
                  <span>Impuestos / IVA:</span>
                  <span>$ {formatMoney(compra.impuestos)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold text-gray-900 border-t border-gray-400 mt-1">
                <span>TOTAL:</span>
                <span>$ {formatMoney(compra.total)}</span>
              </div>
            </div>

            {/* Notas */}
            {compra.notas && (
              <div className="border-l-4 border-gray-300 pl-3 text-gray-500 text-xs mt-4">
                <strong>Notas:</strong> {compra.notas}
              </div>
            )}

            {/* Firmas */}
            <div className="flex justify-around mt-10">
              {['Firma del proveedor', 'Sello del proveedor', 'Recibido por'].map(label => (
                <div key={label} className="text-center" style={{ width: '150px' }}>
                  <div className="border-t border-gray-500 pt-1 text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer mt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cerrar
            </button>
            <button type="button" onClick={handlePrint} className="btn btn-primary">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemitoModal;
