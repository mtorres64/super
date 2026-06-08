import React from 'react';
import {
  Calendar,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingDown,
  Filter,
  Building2,
  Truck,
  Printer
} from 'lucide-react';
import SortIcon from '../ui/SortIcon';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const PurchasesReportView = ({
  filteredCompras,
  stats,
  dailyData,
  topProveedores,
  branches,
  proveedores,
  dateFilter,
  setDateFilter,
  branchFilter,
  setBranchFilter,
  proveedorFilter,
  setProveedorFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  generatingPdf,
  handleExportPDF,
  exportToXLSX,
  formatDate,
  formatAmount,
  getBranchName,
  getProveedorName,
  sortConfig,
  requestSort,
}) => {
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporte de Compras</h1>
          <p className="text-gray-600">Análisis y estadísticas de compras a proveedores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary flex items-center gap-2"
            disabled={filteredCompras.length === 0 || generatingPdf}
          >
            <Printer className="w-4 h-4" />
            {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={exportToXLSX}
            className="btn btn-secondary"
            disabled={filteredCompras.length === 0}
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

          {/* Filtro sucursal */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">Todas las sucursales</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro proveedor */}
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={proveedorFilter}
              onChange={(e) => setProveedorFilter(e.target.value)}
            >
              <option value="all">Todos los proveedores</option>
              {proveedores.map(prov => (
                <option key={prov.id} value={prov.id}>{prov.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro fecha */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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
                onChange={(e) => setCustomDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="form-input"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="dashboard-grid mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Compras</div>
            <div className="stat-icon"><ShoppingBag className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">{stats.totalCompras}</div>
          <p className="text-sm text-gray-500 mt-2">Facturas registradas</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Gastado</div>
            <div className="stat-icon"><DollarSign className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${formatAmount(stats.totalGastado)}</div>
          <p className="text-sm text-gray-500 mt-2">Inversión en compras</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Compra Promedio</div>
            <div className="stat-icon"><TrendingDown className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${formatAmount(stats.promedio)}</div>
          <p className="text-sm text-gray-500 mt-2">Por factura</p>
        </div>
      </div>

      {/* Gráficos */}
      {filteredCompras.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Compras por día */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compras por Día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={60} />
                <Tooltip formatter={(value) => [`$${formatAmount(value)}`, 'Total']} labelFormatter={(l) => `Fecha: ${l}`} />
                <Bar dataKey="total" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top proveedores */}
          {topProveedores.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Proveedores</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={topProveedores}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(value) => [`$${formatAmount(value)}`, 'Total']} />
                  <Bar dataKey="total" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Desglose por sucursal */}
      {branchFilter === 'all' && Object.keys(stats.byBranch).length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            Compras por Sucursal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.byBranch).map(([key, data]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">{data.nombre}</span>
                  <span className="text-sm text-gray-500">{data.count} compras</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">${formatAmount(data.total)}</div>
                <div className="text-sm text-gray-500">
                  {stats.totalGastado > 0 ? ((data.total / stats.totalGastado) * 100).toFixed(1) : 0}% del total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desglose por proveedor */}
      {proveedorFilter === 'all' && Object.keys(stats.byProveedor).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-500" />
            Compras por Proveedor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.byProveedor).map(([key, data]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">{data.nombre}</span>
                  <span className="text-sm text-gray-500">{data.count} facturas</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">${formatAmount(data.total)}</div>
                <div className="text-sm text-gray-500">
                  {stats.totalGastado > 0 ? ((data.total / stats.totalGastado) * 100).toFixed(1) : 0}% del total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de compras */}
      <div className="table-container">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Historial de Compras ({filteredCompras.length})
          </h3>
        </div>

        {filteredCompras.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay compras en el periodo seleccionado</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => requestSort('numero_factura')} className="cursor-pointer select-none hover:bg-gray-50">Factura <SortIcon columnKey="numero_factura" sortConfig={sortConfig} /></th>
                <th onClick={() => requestSort('fecha')} className="cursor-pointer select-none hover:bg-gray-50">Fecha <SortIcon columnKey="fecha" sortConfig={sortConfig} /></th>
                <th>Sucursal</th>
                <th onClick={() => requestSort('proveedor_nombre')} className="cursor-pointer select-none hover:bg-gray-50">Proveedor <SortIcon columnKey="proveedor_nombre" sortConfig={sortConfig} /></th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>Impuestos</th>
                <th style={{ textAlign: 'right' }} onClick={() => requestSort('total')} className="cursor-pointer select-none hover:bg-gray-50">Total <SortIcon columnKey="total" sortConfig={sortConfig} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredCompras.slice(0, 50).map(compra => (
                <tr key={compra.id}>
                  <td data-mobile="title">
                    <span className="font-medium text-blue-600">{compra.numero_factura}</span>
                  </td>
                  <td data-label="Fecha">{formatDate(compra.fecha)}</td>
                  <td data-label="Sucursal">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Building2 className="w-3 h-3" />
                      {getBranchName(compra.sucursal_id)}
                    </span>
                  </td>
                  <td data-label="Proveedor">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Truck className="w-3 h-3" />
                      {getProveedorName(compra.proveedor_id)}
                    </span>
                  </td>
                  <td data-label="Items" className="text-center">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                      {compra.items.length} productos
                    </span>
                  </td>
                  <td data-label="Subtotal" className="text-right">${formatAmount(compra.subtotal)}</td>
                  <td data-label="Impuestos" className="text-right">${formatAmount(compra.impuestos)}</td>
                  <td data-label="Total" className="text-right">
                    <span className="font-semibold text-orange-600">${formatAmount(compra.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchasesReportView;
