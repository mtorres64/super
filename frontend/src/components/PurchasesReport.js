import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import {
  Calendar,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingDown,
  Filter,
  Building2,
  Truck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const PurchasesReport = () => {
  const [compras, setCompras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');
  const [branchFilter, setBranchFilter] = useState('all');
  const [proveedorFilter, setProveedorFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [comprasRes, branchesRes, proveedoresRes] = await Promise.all([
        axios.get(`${API}/compras`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/proveedores`)
      ]);
      setCompras(comprasRes.data);
      setBranches(branchesRes.data);
      setProveedores(proveedoresRes.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin sucursal';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.nombre : branchId;
  };

  const getProveedorName = (proveedorId) => {
    if (!proveedorId) return 'Sin proveedor';
    const prov = proveedores.find(p => p.id === proveedorId);
    return prov ? prov.nombre : proveedorId;
  };

  const getFilteredCompras = () => {
    const now = new Date();
    let filtered = [...compras];

    if (branchFilter !== 'all') {
      filtered = filtered.filter(c => c.sucursal_id === branchFilter);
    }

    if (proveedorFilter !== 'all') {
      filtered = filtered.filter(c => c.proveedor_id === proveedorFilter);
    }

    switch (dateFilter) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(c => new Date(c.fecha) >= today);
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filtered = filtered.filter(c => new Date(c.fecha) >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(c => new Date(c.fecha) >= monthAgo);
        break;
      }
      case 'custom':
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom);
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(c => {
            const d = new Date(c.fecha);
            return d >= fromDate && d <= toDate;
          });
        }
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const calculateStats = (data) => {
    const totalCompras = data.length;
    const totalGastado = data.reduce((sum, c) => sum + c.total, 0);
    const promedio = totalCompras > 0 ? totalGastado / totalCompras : 0;

    const byProveedor = {};
    data.forEach(c => {
      const key = c.proveedor_id || 'sin_proveedor';
      if (byProveedor[key]) {
        byProveedor[key].count++;
        byProveedor[key].total += c.total;
      } else {
        byProveedor[key] = { count: 1, total: c.total, nombre: getProveedorName(key === 'sin_proveedor' ? null : key) };
      }
    });

    const byBranch = {};
    if (branchFilter === 'all') {
      data.forEach(c => {
        const key = c.sucursal_id || 'sin_sucursal';
        if (byBranch[key]) {
          byBranch[key].count++;
          byBranch[key].total += c.total;
        } else {
          byBranch[key] = { count: 1, total: c.total, nombre: getBranchName(key === 'sin_sucursal' ? null : key) };
        }
      });
    }

    return { totalCompras, totalGastado, promedio, byProveedor, byBranch };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const filtered = getFilteredCompras();
    const header = 'Factura,Fecha,Sucursal,Proveedor,Items,Subtotal,Impuestos,Total\n';
    const rows = filtered.map(c =>
      `${c.numero_factura},${formatDate(c.fecha)},${getBranchName(c.sucursal_id)},${getProveedorName(c.proveedor_id)},${c.items.length},${c.subtotal.toFixed(2)},${c.impuestos.toFixed(2)},${c.total.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `compras_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte exportado exitosamente');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  const getDailyData = (data) => {
    const byDay = {};
    data.forEach(item => {
      const d = new Date(item.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (byDay[key]) {
        byDay[key].total += item.total;
        byDay[key].count++;
      } else {
        byDay[key] = { fecha: label, total: item.total, count: 1, key };
      }
    });
    return Object.values(byDay).sort((a, b) => a.key.localeCompare(b.key));
  };

  const getTopProveedores = (data) => {
    const byProv = {};
    data.forEach(c => {
      const nombre = getProveedorName(c.proveedor_id);
      if (byProv[nombre]) {
        byProv[nombre] += c.total;
      } else {
        byProv[nombre] = c.total;
      }
    });
    return Object.entries(byProv)
      .map(([nombre, total]) => ({ nombre, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  };

  const filteredCompras = getFilteredCompras();
  const stats = calculateStats(filteredCompras);
  const dailyData = getDailyData(filteredCompras);
  const topProveedores = getTopProveedores(filteredCompras);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporte de Compras</h1>
          <p className="text-gray-600">Análisis y estadísticas de compras a proveedores</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn btn-secondary"
          disabled={filteredCompras.length === 0}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
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
          <div className="stat-value">${stats.totalGastado.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-2">Inversión en compras</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Compra Promedio</div>
            <div className="stat-icon"><TrendingDown className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${stats.promedio.toFixed(2)}</div>
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
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total']} labelFormatter={(l) => `Fecha: ${l}`} />
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
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total']} />
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
                <div className="text-2xl font-bold text-orange-600">${data.total.toFixed(2)}</div>
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
                <div className="text-2xl font-bold text-orange-600">${data.total.toFixed(2)}</div>
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
                <th>Factura</th>
                <th>Fecha</th>
                <th>Sucursal</th>
                <th>Proveedor</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Impuestos</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompras.slice(0, 50).map(compra => (
                <tr key={compra.id}>
                  <td>
                    <span className="font-medium text-blue-600">{compra.numero_factura}</span>
                  </td>
                  <td>{formatDate(compra.fecha)}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Building2 className="w-3 h-3" />
                      {getBranchName(compra.sucursal_id)}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Truck className="w-3 h-3" />
                      {getProveedorName(compra.proveedor_id)}
                    </span>
                  </td>
                  <td>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                      {compra.items.length} productos
                    </span>
                  </td>
                  <td>${compra.subtotal.toFixed(2)}</td>
                  <td>${compra.impuestos.toFixed(2)}</td>
                  <td>
                    <span className="font-semibold text-orange-600">${compra.total.toFixed(2)}</span>
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

export default PurchasesReport;