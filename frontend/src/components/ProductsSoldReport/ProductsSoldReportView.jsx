import React from 'react';
import {
  Calendar,
  Download,
  DollarSign,
  Package,
  Hash,
  Filter,
  Tag,
  Printer,
  ShoppingCart,
  Building2,
} from 'lucide-react';
import SortIcon from '../ui/SortIcon';
import PaginationView from '../Pagination/PaginationView';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const ProductsSoldReportView = ({
  pagedItems,
  sortedItems,
  sortConfig,
  requestSort,
  stats,
  topProductos,
  branches,
  categorias,
  productosParaFiltro,
  dateFilter,
  setDateFilter,
  branchFilter,
  setBranchFilter,
  categoriaFilter,
  setCategoriaFilter,
  productoFilter,
  setProductoFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  generatingPdf,
  handleExportPDF,
  exportToXLSX,
  formatAmount,
  page,
  setPage,
  totalPages,
  itemsPerPage,
}) => {
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Productos Vendidos</h1>
          <p className="text-gray-600">Cantidad de unidades vendidas por producto en el período</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary flex items-center gap-2"
            disabled={sortedItems.length === 0 || generatingPdf}
          >
            <Printer className="w-4 h-4" />
            {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={exportToXLSX}
            className="btn btn-secondary flex items-center gap-2"
            disabled={sortedItems.length === 0}
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

          {/* Período */}
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
              <option value="all">Todas las fechas</option>
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

          {/* Sucursal */}
          {branches.length > 1 && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select
                className="form-select"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">Todas las sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Categoría */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Producto */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={productoFilter}
              onChange={(e) => setProductoFilter(e.target.value)}
            >
              <option value="all">Todos los productos</option>
              {productosParaFiltro.map(p => (
                <option key={p.nombre} value={p.nombre.toLowerCase()}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="dashboard-grid mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Productos Distintos</div>
            <div className="stat-icon"><Package className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">{stats.totalProductos}</div>
          <p className="text-sm text-gray-500 mt-2">Referencias vendidas</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Unidades</div>
            <div className="stat-icon"><Hash className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">{stats.totalUnidades.toFixed(0)}</div>
          <p className="text-sm text-gray-500 mt-2">Unidades vendidas</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Recaudado</div>
            <div className="stat-icon"><DollarSign className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${formatAmount(stats.totalRecaudado)}</div>
          <p className="text-sm text-gray-500 mt-2">Por productos filtrados</p>
        </div>
      </div>

      {/* Gráfico top 10 */}
      {topProductos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 — Más vendidos (unidades)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={topProductos}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v) => [v, 'Unidades']} />
              <Bar dataKey="cantidad" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla */}
      <div className="table-container">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detalle por Producto ({sortedItems.length})
          </h3>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay ventas en el período seleccionado</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th
                    onClick={() => requestSort('nombre')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Producto <SortIcon columnKey="nombre" sortConfig={sortConfig} />
                  </th>
                  <th
                    onClick={() => requestSort('branch_nombre')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Sucursal <SortIcon columnKey="branch_nombre" sortConfig={sortConfig} />
                  </th>
                  <th
                    onClick={() => requestSort('categoria_nombre')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Categoría <SortIcon columnKey="categoria_nombre" sortConfig={sortConfig} />
                  </th>
                  <th
                    style={{ textAlign: 'center' }}
                    onClick={() => requestSort('cantidad_vendida')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Cant. Vendida <SortIcon columnKey="cantidad_vendida" sortConfig={sortConfig} />
                  </th>
                  <th
                    style={{ textAlign: 'center' }}
                    onClick={() => requestSort('stock_actual')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Stock Actual <SortIcon columnKey="stock_actual" sortConfig={sortConfig} />
                  </th>
                  <th
                    style={{ textAlign: 'right' }}
                    onClick={() => requestSort('precio_promedio')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Precio Prom. <SortIcon columnKey="precio_promedio" sortConfig={sortConfig} />
                  </th>
                  <th
                    style={{ textAlign: 'center' }}
                    onClick={() => requestSort('num_ventas')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    N° Ventas <SortIcon columnKey="num_ventas" sortConfig={sortConfig} />
                  </th>
                  <th
                    style={{ textAlign: 'right' }}
                    onClick={() => requestSort('total_recaudado')}
                    className="cursor-pointer select-none hover:bg-gray-50"
                  >
                    Total <SortIcon columnKey="total_recaudado" sortConfig={sortConfig} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((p, i) => (
                  <tr key={`${p.nombre}-${p.branch_id}-${i}`}>
                    <td data-mobile="title">
                      <span className="font-medium text-gray-900">{p.nombre}</span>
                    </td>
                    <td data-label="Sucursal">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Building2 className="w-3 h-3" />
                        {p.branch_nombre}
                      </span>
                    </td>
                    <td data-label="Categoría">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Tag className="w-3 h-3" />
                        {p.categoria_nombre}
                      </span>
                    </td>
                    <td data-label="Cant. Vendida" className="text-center">
                      <span className="font-semibold text-gray-800">
                        {Number.isInteger(p.cantidad_vendida) ? p.cantidad_vendida : p.cantidad_vendida.toFixed(2)}
                      </span>
                    </td>
                    <td data-label="Stock Actual" className="text-center">
                      <span className={`font-semibold ${p.stock_actual <= 0 ? 'text-red-600' : p.stock_actual <= 5 ? 'text-yellow-600' : 'text-gray-800'}`}>
                        {p.stock_actual}
                      </span>
                    </td>
                    <td data-label="Precio Prom." className="text-right text-gray-600">
                      ${formatAmount(p.precio_promedio)}
                    </td>
                    <td data-label="N° Ventas" className="text-center">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                        {p.num_ventas}
                      </span>
                    </td>
                    <td data-label="Total" className="text-right">
                      <span className="font-semibold text-green-700">
                        ${formatAmount(p.total_recaudado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationView
              currentPage={page}
              totalPages={totalPages}
              totalItems={sortedItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              itemName="productos"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsSoldReportView;
