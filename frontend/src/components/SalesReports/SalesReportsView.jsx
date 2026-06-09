import React from 'react';
import {
  Calendar,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Filter,
  Building2,
  Printer,
  RotateCcw,
  RefreshCw,
  X,
  User,
  FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import Pagination from '../Pagination';
import ReturnModal from '../ReturnModal';
import TicketModal from '../TicketModal';
import SortIcon from '../ui/SortIcon';

const SalesReportsView = ({
  loading,
  branches,
  users,
  config,
  afipConfig,
  generatingPdf,
  dateFilter,
  branchFilter,
  userFilter,
  page,
  customDateFrom,
  customDateTo,
  returnModal,
  reprintSale,
  reprintReturns,
  retryingAfip,
  fromCaja,
  canFilterByUser,
  currentUser,
  filteredSales,
  itemsPerPage,
  totalPages,
  pagedSales,
  stats,
  dailyData,
  topProducts,
  paymentPieData,
  saleNetTotal,
  allCreditNotes,
  saleCreditNotesMap,
  onSetDateFilter,
  onSetBranchFilter,
  onSetUserFilter,
  onSetPage,
  onSetCustomDateFrom,
  onSetCustomDateTo,
  onSetReturnModal,
  onHandleReprintSale,
  onHandleExportPDF,
  onExportToXLSX,
  onOpenReturnModal,
  onHandleRetryAfip,
  retryingAfipNc,
  onHandleRetryAfipNc,
  onFetchSales,
  onPrintReprintTicket,
  onSetReprintSale,
  onSetReprintReturns,
  getBranchName,
  getCajeroName,
  getPaymentMethodLabel,
  formatDate,
  formatAmount,
  sortConfig,
  requestSort,
}) => {
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes de Ventas</h1>
          <p className="text-gray-600">Análisis y estadísticas de ventas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onHandleExportPDF}
            className="btn btn-secondary flex items-center gap-2"
            disabled={filteredSales.length === 0 || generatingPdf}
          >
            <Printer className="w-4 h-4" />
            {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={onExportToXLSX}
            className="btn btn-secondary"
            disabled={filteredSales.length === 0}
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filtrar por:</span>
          </div>

          {/* Filtro usuario */}
          {fromCaja && !canFilterByUser ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="form-select bg-gray-50 cursor-default text-gray-700">
                {currentUser?.nombre || 'Mi usuario'}
              </span>
            </div>
          ) : canFilterByUser && users.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                className="form-select"
                value={userFilter}
                onChange={(e) => onSetUserFilter(e.target.value)}
              >
                <option value="all">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro sucursal */}
          {!canFilterByUser ? (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="form-select bg-gray-50 cursor-default text-gray-700">
                {branchFilter && branchFilter !== 'all' ? (branches.find(b => b.id === branchFilter)?.nombre || 'Mi sucursal') : 'Sin sucursal'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select
                className="form-select"
                value={branchFilter}
                onChange={(e) => onSetBranchFilter(e.target.value)}
              >
                <option value="all">Todas las sucursales</option>
                <option value="global">Sin sucursal</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro fecha */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={dateFilter}
              onChange={(e) => onSetDateFilter(e.target.value)}
            >
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="all">Todas</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                className="form-input"
                value={customDateFrom}
                onChange={(e) => onSetCustomDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="form-input"
                value={customDateTo}
                onChange={(e) => onSetCustomDateTo(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="dashboard-grid mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Ventas</div>
            <div className="stat-icon"><ShoppingBag className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">{stats.totalSales}</div>
          <p className="text-sm text-gray-500 mt-2">Transacciones procesadas</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Ingresos Totales</div>
            <div className="stat-icon"><DollarSign className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${formatAmount(stats.totalRevenue)}</div>
          <p className="text-sm text-gray-500 mt-2">Revenue generado</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Venta Promedio</div>
            <div className="stat-icon"><TrendingUp className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${formatAmount(stats.averageSale)}</div>
          <p className="text-sm text-gray-500 mt-2">Por transacción</p>
        </div>
      </div>

      {/* Gráficos */}
      {filteredSales.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Ventas por día */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={60} />
                <Tooltip formatter={(value) => [`$${formatAmount(value)}`, 'Total']} labelFormatter={(l) => `Fecha: ${l}`} />
                <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Métodos de pago */}
          {paymentPieData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Método de Pago</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paymentPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${formatAmount(value)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 5 productos más vendidos */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Productos Más Vendidos</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} u.`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={115} />
                  <Tooltip formatter={(value) => [`${value} unidades`, 'Cantidad vendida']} />
                  <Bar dataKey="cantidad" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Desglose por sucursal (solo cuando no hay filtro de sucursal) */}
      {branchFilter === 'all' && Object.keys(stats.branchStats).length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            Ventas por Sucursal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.branchStats).map(([branchId, data]) => (
              <div key={branchId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">{data.nombre}</span>
                  <span className="text-sm text-gray-500">{data.count} ventas</span>
                </div>
                <div className="text-2xl font-bold text-green-600">${formatAmount(data.total)}</div>
                <div className="text-sm text-gray-500">
                  {stats.totalRevenue > 0 ? ((data.total / stats.totalRevenue) * 100).toFixed(1) : 0}% del total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métodos de pago */}
      {Object.keys(stats.paymentMethods).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.paymentMethods).map(([method, data]) => (
              <div key={method} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">{getPaymentMethodLabel(method)}</span>
                  <span className="text-sm text-gray-500">{data.count} ventas</span>
                </div>
                <div className="text-2xl font-bold text-green-600">${formatAmount(data.total)}</div>
                <div className="text-sm text-gray-500">
                  {stats.totalRevenue > 0 ? ((data.total / stats.totalRevenue) * 100).toFixed(1) : 0}% del total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de ventas */}
      <div className="table-container">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Historial de Ventas ({filteredSales.length})
            {branchFilter !== 'all' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {getBranchName(branchFilter)}
              </span>
            )}
          </h3>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay ventas en el periodo seleccionado</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => requestSort('numero_factura')} className="cursor-pointer select-none hover:bg-gray-50">Factura <SortIcon columnKey="numero_factura" sortConfig={sortConfig} /></th>
                <th className="hidden lg:table-cell cursor-pointer select-none hover:bg-gray-50" onClick={() => requestSort('fecha')}>Fecha <SortIcon columnKey="fecha" sortConfig={sortConfig} /></th>
                <th className="hidden lg:table-cell">Sucursal</th>
                <th className="hidden lg:table-cell" style={{ textAlign: 'center' }}>Items</th>
                <th className="hidden lg:table-cell" style={{ textAlign: 'right' }}>Subtotal</th>
                <th className="hidden lg:table-cell" style={{ textAlign: 'right' }}>Descuento/Recargo</th>
                <th style={{ textAlign: 'right' }} onClick={() => requestSort('total')} className="cursor-pointer select-none hover:bg-gray-50">Total <SortIcon columnKey="total" sortConfig={sortConfig} /></th>
                <th style={{ textAlign: 'center' }} onClick={() => requestSort('metodo_pago')} className="cursor-pointer select-none hover:bg-gray-50">Método de Pago <SortIcon columnKey="metodo_pago" sortConfig={sortConfig} /></th>
                <th className="hidden md:table-cell">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedSales.map(sale => (
                <tr key={sale.id}>
                  <td data-mobile="title">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-blue-600">{sale.numero_factura}</span>
                      {sale.tipo_comprobante
                        ? <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium w-fit">{{ 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' }[sale.tipo_comprobante] || 'Factura'}</span>
                        : <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium w-fit">Ticket</span>
                      }
                      {(saleCreditNotesMap?.[sale.id] || []).map(nc => (
                        <span key={nc.id} className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium w-fit flex items-center gap-1">
                          <FileText className="w-3 h-3" />{nc.numero_nota_credito}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell" data-label="Fecha">{formatDate(sale.fecha)}</td>
                  <td className="hidden lg:table-cell" data-label="Sucursal">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Building2 className="w-3 h-3" />
                      {getBranchName(sale.branch_id)}
                    </span>
                  </td>
                  <td className="text-center" data-label="Items">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                      {sale.items.length} productos
                    </span>
                  </td>
                  <td className="hidden lg:table-cell text-right" data-label="Subtotal">${formatAmount(sale.subtotal)}</td>
                  <td className="hidden lg:table-cell text-right" data-label="Desc./Recargo">
                    {(() => {
                      const adj = sale.total - sale.subtotal - (sale.impuestos || 0);
                      if (Math.abs(adj) < 0.01) return <span className="text-gray-300">—</span>;
                      return (
                        <span className={adj < 0 ? 'text-green-600' : 'text-red-600'}>
                          {adj < 0 ? '-' : '+'} ${formatAmount(Math.abs(adj))}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-right" data-label="Total">
                    <span className="font-semibold text-green-600">
                      ${formatAmount(Math.max(0, sale.total - (saleNetTotal?.[sale.id] || 0)))}
                    </span>
                  </td>
                  <td className="text-center" data-label="Pago">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sale.metodo_pago === 'efectivo'
                        ? 'bg-green-100 text-green-800'
                        : sale.metodo_pago === 'tarjeta'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {getPaymentMethodLabel(sale.metodo_pago)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell" data-label="Estado">
                    <div className="flex flex-col gap-1">
                      {sale.estado === 'cancelado' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelada</span>
                      ) : sale.estado === 'devolucion_parcial' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Dev. parcial</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Activa</span>
                      )}
                      {sale.afip_estado === 'autorizado' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">CAE ✓</span>
                      )}
                      {(sale.afip_estado === 'contingencia' || sale.afip_estado === 'error') && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          {sale.afip_estado === 'contingencia' ? 'Contingencia' : 'Error AFIP'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-mobile="actions">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onHandleReprintSale(sale)}
                        className="btn btn-sm flex items-center gap-1"
                        style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
                        title="Reimprimir ticket"
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                      {sale.estado !== 'cancelado' && (
                        <button
                          onClick={() => onOpenReturnModal(sale)}
                          className="btn btn-sm flex items-center gap-1"
                          style={{ background: 'var(--tertiary)', color: 'var(--tertiary-text)' }}
                          title="Procesar devolución"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      {(sale.afip_estado === 'contingencia' || sale.afip_estado === 'error') && currentUser?.rol === 'admin' && (
                        <button
                          onClick={() => onHandleRetryAfip(sale.id)}
                          disabled={retryingAfip === sale.id}
                          className="btn btn-sm flex items-center gap-1"
                          style={{ background: '#d97706', color: '#fff' }}
                          title="Reintentar obtener CAE"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingAfip === sale.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredSales.length}
          itemsPerPage={itemsPerPage}
          onPageChange={onSetPage}
          itemName="ventas"
        />
      </div>

      {/* Notas de Crédito */}
      {(() => {
        const filteredSaleIds = new Set(filteredSales.map(s => s.id));
        const filteredNotes = (allCreditNotes || []).filter(nc => filteredSaleIds.has(nc.sale_id));
        if (filteredNotes.length === 0) return null;
        return (
          <div className="table-container mt-6">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <FileText className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Notas de Crédito ({filteredNotes.length})
              </h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>N° Nota de Crédito</th>
                  <th>Factura Original</th>
                  <th className="hidden lg:table-cell">Fecha</th>
                  <th className="hidden lg:table-cell">Motivo</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Tipo</th>
                  <th style={{ textAlign: 'center' }}>AFIP</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map(nc => (
                  <tr key={nc.id}>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-amber-700 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />{nc.numero_nota_credito}
                        </span>
                        {nc.nro_comprobante_afip && (
                          <span className="text-xs text-gray-500">
                            Nº {String(nc.nro_comprobante_afip).padStart(8, '0')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-blue-600 font-medium">{nc.numero_factura_original}</span>
                    </td>
                    <td className="hidden lg:table-cell">{formatDate(nc.fecha)}</td>
                    <td className="hidden lg:table-cell text-gray-500 text-sm">
                      {nc.motivo || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-right">
                      <span className="font-semibold text-red-600">${formatAmount(nc.total)}</span>
                    </td>
                    <td className="text-center">
                      {nc.tipo === 'total'
                        ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Total</span>
                        : <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Parcial</span>
                      }
                    </td>
                    <td className="text-center">
                      {nc.afip_estado === 'autorizado' ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">CAE ✓</span>
                          {nc.cae_vencimiento && (
                            <span className="text-xs text-gray-500">
                              Vto: {nc.cae_vencimiento.slice(6,8)}/{nc.cae_vencimiento.slice(4,6)}/{nc.cae_vencimiento.slice(0,4)}
                            </span>
                          )}
                        </div>
                      ) : nc.afip_estado === 'contingencia' ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Contingencia</span>
                            {currentUser?.rol === 'admin' && (
                              <button
                                onClick={() => onHandleRetryAfipNc(nc.id, nc.tipo_comprobante_nc)}
                                disabled={retryingAfipNc === nc.id}
                                className="btn btn-sm"
                                style={{ background: '#d97706', color: '#fff', padding: '2px 6px' }}
                                title="Reintentar obtener CAE para esta nota de crédito"
                              >
                                <RefreshCw className={`w-3 h-3 ${retryingAfipNc === nc.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                          </div>
                          {nc.afip_error && (
                            <span className="text-xs text-red-500 max-w-[160px] text-center leading-tight" title={nc.afip_error}>
                              {nc.afip_error.length > 60 ? nc.afip_error.slice(0, 60) + '…' : nc.afip_error}
                            </span>
                          )}
                        </div>
                      ) : nc.afip_estado === 'no_aplica' ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Reprint Ticket Modal */}
      <TicketModal
        sale={reprintSale}
        returns={reprintReturns}
        config={config}
        afipConfig={afipConfig}
        cajeroName={getCajeroName(reprintSale?.cajero_id)}
        title="Reimprimir Ticket"
        onClose={() => { onSetReprintSale(null); onSetReprintReturns([]); }}
        onPrint={onPrintReprintTicket}
      />

      {/* Return Modal */}
      {returnModal && (
        <ReturnModal
          sale={returnModal.sale}
          returnedQty={returnModal.returnedQty}
          onClose={() => onSetReturnModal(null)}
          onSuccess={onFetchSales}
        />
      )}
    </div>
  );
};

export default SalesReportsView;
