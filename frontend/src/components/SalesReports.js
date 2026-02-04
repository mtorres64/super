import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { 
  Calendar, 
  Download, 
  DollarSign, 
  ShoppingBag,
  TrendingUp,
  Filter
} from 'lucide-react';

const SalesReports = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API}/sales`);
      setSales(response.data);
    } catch (error) {
      toast.error('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSales = () => {
    const now = new Date();
    let filteredSales = [...sales];

    switch (dateFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.fecha);
          return saleDate >= today;
        });
        break;
      
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.fecha);
          return saleDate >= weekAgo;
        });
        break;
      
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.fecha);
          return saleDate >= monthAgo;
        });
        break;
      
      case 'custom':
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom);
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          
          filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.fecha);
            return saleDate >= fromDate && saleDate <= toDate;
          });
        }
        break;
      
      default:
        filteredSales = sales;
    }

    return filteredSales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const calculateStats = (salesData) => {
    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Group by payment method
    const paymentMethods = {};
    salesData.forEach(sale => {
      if (paymentMethods[sale.metodo_pago]) {
        paymentMethods[sale.metodo_pago].count++;
        paymentMethods[sale.metodo_pago].total += sale.total;
      } else {
        paymentMethods[sale.metodo_pago] = {
          count: 1,
          total: sale.total
        };
      }
    });

    return {
      totalSales,
      totalRevenue,
      averageSale,
      paymentMethods
    };
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

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'efectivo': 'Efectivo',
      'tarjeta': 'Tarjeta',
      'transferencia': 'Transferencia'
    };
    return labels[method] || method;
  };

  const exportToCSV = () => {
    const filteredSales = getFilteredSales();
    
    const csvHeader = 'Factura,Fecha,Cajero,Total,Metodo Pago,Items\n';
    const csvRows = filteredSales.map(sale => {
      const items = sale.items.length;
      return `${sale.numero_factura},${formatDate(sale.fecha)},${sale.cajero_id},${sale.total.toFixed(2)},${getPaymentMethodLabel(sale.metodo_pago)},${items}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
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

  const filteredSales = getFilteredSales();
  const stats = calculateStats(filteredSales);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reportes de Ventas
          </h1>
          <p className="text-gray-600">
            Análisis y estadísticas de ventas
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn btn-secondary"
          disabled={filteredSales.length === 0}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filtrar por:</span>
          </div>
          
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

          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                className="form-input"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                placeholder="Desde"
              />
              <input
                type="date"
                className="form-input"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                placeholder="Hasta"
              />
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-grid mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Ventas</div>
            <div className="stat-icon">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">{stats.totalSales}</div>
          <p className="text-sm text-gray-500 mt-2">
            Transacciones procesadas
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Ingresos Totales</div>
            <div className="stat-icon">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-2">
            Revenue generado
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Venta Promedio</div>
            <div className="stat-icon">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">${stats.averageSale.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-2">
            Por transacción
          </p>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      {Object.keys(stats.paymentMethods).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Métodos de Pago
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.paymentMethods).map(([method, data]) => (
              <div key={method} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">
                    {getPaymentMethodLabel(method)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {data.count} ventas
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${data.total.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {((data.total / stats.totalRevenue) * 100).toFixed(1)}% del total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="table-container">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Historial de Ventas ({filteredSales.length})
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
                <th>Factura</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Impuestos</th>
                <th>Total</th>
                <th>Método de Pago</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.slice(0, 20).map(sale => (
                <tr key={sale.id}>
                  <td>
                    <span className="font-medium text-blue-600">
                      {sale.numero_factura}
                    </span>
                  </td>
                  <td>{formatDate(sale.fecha)}</td>
                  <td>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                      {sale.items.length} productos
                    </span>
                  </td>
                  <td>${sale.subtotal.toFixed(2)}</td>
                  <td>${sale.impuestos.toFixed(2)}</td>
                  <td>
                    <span className="font-semibold text-green-600">
                      ${sale.total.toFixed(2)}
                    </span>
                  </td>
                  <td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SalesReports;