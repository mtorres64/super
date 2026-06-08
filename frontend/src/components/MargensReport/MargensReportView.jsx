import React from 'react';
import { X, TrendingUp, ChevronDown, ChevronRight, RefreshCw, Calendar, Building2, ShoppingCart, CalendarDays, Info } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'month', label: 'Este mes' },
  { key: 'week', label: 'Esta semana' },
  { key: 'last30', label: 'Últimos 30 días' },
  { key: 'year', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
];

const MargenBadge = ({ pct }) => {
  if (pct === null || pct === undefined) return <span className="text-gray-400 text-xs">sin costo</span>;
  const color = pct >= 30 ? 'text-green-700 bg-green-50' : pct >= 15 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      {pct.toFixed(1)}%
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title, expanded, onToggle, total, formatMoney }) => (
  <button
    type="button"
    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg border border-gray-200"
    onClick={onToggle}
  >
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </div>
    <div className="flex items-center gap-3">
      {total !== undefined && (
        <span className="text-sm font-bold text-green-700">${formatMoney(total)}</span>
      )}
      {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
    </div>
  </button>
);

const MargensReportView = ({
  data,
  branches,
  loading,
  dateFilter,
  setDateFilter,
  branchFilter,
  setBranchFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  detailModal,
  setDetailModal,
  expandedSection,
  setExpandedSection,
  formatMoney,
  formatDate,
  formatDateTime,
  onRefresh,
}) => {
  const toggleSection = (key) => setExpandedSection(prev => prev === key ? null : key);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary" />
            Márgenes
          </h1>
          <p className="text-gray-500 text-sm">Markup calculado sobre el costo registrado de cada producto (ganancia / costo)</p>
        </div>
        <button onClick={onRefresh} className="btn btn-secondary btn-sm flex items-center gap-1.5" disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Período */}
          <div>
            <label className="form-label mb-1">Período</label>
            <div className="flex gap-1 flex-wrap">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDateFilter(opt.key)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border ${
                    dateFilter === opt.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango personalizado */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="form-input h-9 text-sm"
                value={customDateFrom}
                onChange={e => setCustomDateFrom(e.target.value)}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                className="form-input h-9 text-sm"
                value={customDateTo}
                onChange={e => setCustomDateTo(e.target.value)}
              />
            </div>
          )}

          {/* Sucursal */}
          {branches.length > 0 && (
            <div>
              <label className="form-label mb-1">Sucursal</label>
              <select className="form-input h-9 text-sm" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="all">Todas</option>
                {branches.filter(b => b.activo).map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="spinner w-8 h-8" />
        </div>
      ) : !data ? null : (
        <>
          {/* Resumen general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total ventas', value: `$${formatMoney(data.resumen.ventas_total)}`, sub: `${data.resumen.num_ventas} transacciones`, color: 'text-gray-800' },
              { label: 'Costo total', value: `$${formatMoney(data.resumen.costo_total)}`, sub: 'según costo registrado', color: 'text-gray-800' },
              { label: 'Margen bruto', value: `$${formatMoney(data.resumen.margen_total)}`, sub: 'ventas − costo', color: 'text-green-700' },
              { label: 'Markup %', value: `${data.resumen.margen_pct?.toFixed(1) ?? '—'}%`, sub: 'ganancia / costo', color: data.resumen.margen_pct >= 30 ? 'text-green-700' : data.resumen.margen_pct >= 15 ? 'text-yellow-600' : 'text-red-600' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">

            {/* Por fecha */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <SectionHeader
                icon={Calendar}
                title="Margen por fecha"
                expanded={expandedSection === 'por_fecha'}
                onToggle={() => toggleSection('por_fecha')}
                total={data.resumen.margen_total}
                formatMoney={formatMoney}
              />
              {expandedSection === 'por_fecha' && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen $</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Markup %</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_fecha.map((row, i) => (
                        <tr key={row.fecha} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-2 font-medium text-gray-800">{formatDate(row.fecha)}</td>
                          <td className="px-4 py-2 text-right text-gray-600">${formatMoney(row.ventas_total)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">${formatMoney(row.costo_total)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">${formatMoney(row.margen_total)}</td>
                          <td className="px-4 py-2 text-center"><MargenBadge pct={row.margen_pct} /></td>
                          <td className="px-4 py-2 text-right text-gray-500">{row.num_ventas}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ type: 'por_fecha', row, _allVentas: data.por_venta })}
                              className="text-gray-400 hover:text-primary"
                              title="Ver detalle"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-700">${formatMoney(data.resumen.ventas_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">${formatMoney(data.resumen.costo_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">${formatMoney(data.resumen.margen_total)}</td>
                        <td className="px-4 py-2 text-center"><MargenBadge pct={data.resumen.margen_pct} /></td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">{data.resumen.num_ventas}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Por día de semana */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <SectionHeader
                icon={CalendarDays}
                title="Margen por día de la semana"
                expanded={expandedSection === 'por_dia'}
                onToggle={() => toggleSection('por_dia')}
                formatMoney={formatMoney}
              />
              {expandedSection === 'por_dia' && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Día</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen $</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Markup %</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Transacciones</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_dia_semana.map((row, i) => (
                        <tr key={row.dia_numero} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-2 font-medium text-gray-800">{row.dia_nombre}</td>
                          <td className="px-4 py-2 text-right text-gray-600">${formatMoney(row.ventas_total)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">${formatMoney(row.costo_total)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">${formatMoney(row.margen_total)}</td>
                          <td className="px-4 py-2 text-center"><MargenBadge pct={row.margen_pct} /></td>
                          <td className="px-4 py-2 text-right text-gray-500">{row.num_ventas}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ type: 'por_dia', row, _allVentas: data.por_venta })}
                              className="text-gray-400 hover:text-primary"
                              title="Ver detalle"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-700">${formatMoney(data.resumen.ventas_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">${formatMoney(data.resumen.costo_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">${formatMoney(data.resumen.margen_total)}</td>
                        <td className="px-4 py-2 text-center"><MargenBadge pct={data.resumen.margen_pct} /></td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">{data.resumen.num_ventas}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Por sucursal */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <SectionHeader
                icon={Building2}
                title="Margen por sucursal"
                expanded={expandedSection === 'por_sucursal'}
                onToggle={() => toggleSection('por_sucursal')}
                formatMoney={formatMoney}
              />
              {expandedSection === 'por_sucursal' && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen $</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Markup %</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Transacciones</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_sucursal.map((row, i) => (
                        <tr key={row.branch_id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-2 font-medium text-gray-800">{row.branch_nombre || '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-600">${formatMoney(row.ventas_total)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">${formatMoney(row.costo_total)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">${formatMoney(row.margen_total)}</td>
                          <td className="px-4 py-2 text-center"><MargenBadge pct={row.margen_pct} /></td>
                          <td className="px-4 py-2 text-right text-gray-500">{row.num_ventas}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ type: 'por_sucursal', row, _allVentas: data.por_venta })}
                              className="text-gray-400 hover:text-primary"
                              title="Ver detalle"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-700">${formatMoney(data.resumen.ventas_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">${formatMoney(data.resumen.costo_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">${formatMoney(data.resumen.margen_total)}</td>
                        <td className="px-4 py-2 text-center"><MargenBadge pct={data.resumen.margen_pct} /></td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">{data.resumen.num_ventas}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Por venta */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <SectionHeader
                icon={ShoppingCart}
                title="Margen por venta"
                expanded={expandedSection === 'por_venta'}
                onToggle={() => toggleSection('por_venta')}
                formatMoney={formatMoney}
              />
              {expandedSection === 'por_venta' && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">N° Venta</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Margen $</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Markup %</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_venta.map((row, i) => (
                        <tr key={row.sale_id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-2 text-gray-600 text-xs">{formatDateTime(row.fecha)}</td>
                          <td className="px-4 py-2 font-medium text-gray-800">{row.numero_factura}</td>
                          <td className="px-4 py-2 text-gray-600">{row.branch_nombre || '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-600">${formatMoney(row.ventas_total)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">${formatMoney(row.costo_total)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">${formatMoney(row.margen_total)}</td>
                          <td className="px-4 py-2 text-center"><MargenBadge pct={row.margen_pct} /></td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ type: 'por_venta', row })}
                              className="text-gray-400 hover:text-primary"
                              title="Ver detalle"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-700">${formatMoney(data.resumen.ventas_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-600">${formatMoney(data.resumen.costo_total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">${formatMoney(data.resumen.margen_total)}</td>
                        <td className="px-4 py-2 text-center"><MargenBadge pct={data.resumen.margen_pct} /></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Modal de detalle */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px', width: '95vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {detailModal.type === 'por_fecha' && `Detalle — ${formatDate(detailModal.row.fecha)}`}
                {detailModal.type === 'por_dia' && `Detalle — ${detailModal.row.dia_nombre}`}
                {detailModal.type === 'por_sucursal' && `Detalle — ${detailModal.row.branch_nombre}`}
                {detailModal.type === 'por_venta' && `Detalle — ${detailModal.row.numero_factura}`}
              </h2>
              <button onClick={() => setDetailModal(null)} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">

              {/* Resumen del grupo */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Ventas', value: `$${formatMoney(detailModal.row.ventas_total)}` },
                  { label: 'Costo', value: `$${formatMoney(detailModal.row.costo_total)}` },
                  { label: 'Margen bruto', value: `$${formatMoney(detailModal.row.margen_total)}`, green: true },
                ].map(({ label, value, green }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${green ? 'text-green-700' : 'text-gray-800'}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Para por_venta mostramos items de esa venta */}
              {detailModal.type === 'por_venta' && detailModal.row.items?.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Producto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Cant.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">P. venta</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Costo</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Margen $</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Markup %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.row.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-800">{item.nombre}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-gray-600">${formatMoney(item.subtotal_venta)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {item.subtotal_costo != null ? `$${formatMoney(item.subtotal_costo)}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">
                            {item.margen != null ? `$${formatMoney(item.margen)}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center"><MargenBadge pct={item.margen_pct} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Para otros tipos mostramos las ventas del grupo */}
              {detailModal.type !== 'por_venta' && (() => {
                const ventas = detailModal.type === 'por_fecha'
                  ? (detailModal._allVentas || []).filter(v => v.fecha_dia === detailModal.row.fecha)
                  : detailModal.type === 'por_dia'
                  ? (detailModal._allVentas || []).filter(v => v.dia_semana === detailModal.row.dia_numero)
                  : (detailModal._allVentas || []).filter(v => v.branch_id === detailModal.row.branch_id);

                if (!ventas.length) {
                  return (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Hacé clic en <Info className="w-3.5 h-3.5 inline" /> en una fila de la tabla para ver el detalle de esa agrupación.
                    </p>
                  );
                }
                return (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Margen $</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Markup %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map((v, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{v.numero_factura}</td>
                            <td className="px-3 py-2 text-right text-gray-600">${formatMoney(v.ventas_total)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-green-700">${formatMoney(v.margen_total)}</td>
                            <td className="px-3 py-2 text-center"><MargenBadge pct={v.margen_pct} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MargensReportView;
