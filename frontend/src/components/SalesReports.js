import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import Pagination from './Pagination';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
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
  X,
  User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PAYMENT_COLORS = {
  efectivo: '#16a34a',
  tarjeta: '#2563eb',
  transferencia: '#7c3aed'
};

const SalesReports = () => {
  const { user: currentUser } = useContext(AuthContext);
  const canFilterByUser = ['admin', 'supervisor'].includes(currentUser?.rol);

  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [returnModal, setReturnModal] = useState(null); // { sale, returnedQty }
  const [returnSelected, setReturnSelected] = useState({});   // { producto_id: bool }
  const [returnQuantities, setReturnQuantities] = useState({}); // { producto_id: number }
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [reprintSale, setReprintSale] = useState(null);

  useEffect(() => {
    fetchSales();
    fetchBranches();
    fetchConfiguration();
    if (canFilterByUser) fetchUsers();
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

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      console.error('Error al cargar sucursales');
    }
  };

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading configuration');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios');
    }
  };

  const getCajeroName = (cajeroId) => {
    const found = users.find(u => u.id === cajeroId);
    return found ? found.nombre : null;
  };

  const printReprintTicket = () => {
    window.print();
  };

  const getBranchName = (branchId) => {
    if (!branchId || branchId === 'global') return 'Sin sucursal';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.nombre : branchId;
  };

  const getFilteredSales = () => {
    const now = new Date();
    let filteredSales = [...sales];

    // Filtro por sucursal
    if (branchFilter !== 'all') {
      filteredSales = filteredSales.filter(sale => sale.branch_id === branchFilter);
    }

    // Filtro por usuario (solo admin/supervisor)
    if (canFilterByUser && userFilter !== 'all') {
      filteredSales = filteredSales.filter(sale => sale.cajero_id === userFilter);
    }

    // Filtro por fecha
    switch (dateFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= today);
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= monthAgo);
        break;
      case 'custom':
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom);
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.fecha);
            return saleDate >= fromDate && saleDate <= toDate;
          });
        }
        break;
      default:
        break;
    }

    return filteredSales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const calculateStats = (salesData) => {
    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const paymentMethods = {};
    salesData.forEach(sale => {
      if (paymentMethods[sale.metodo_pago]) {
        paymentMethods[sale.metodo_pago].count++;
        paymentMethods[sale.metodo_pago].total += sale.total;
      } else {
        paymentMethods[sale.metodo_pago] = { count: 1, total: sale.total };
      }
    });

    // Desglose por sucursal (solo si no hay filtro de sucursal)
    const branchStats = {};
    if (branchFilter === 'all') {
      salesData.forEach(sale => {
        const key = sale.branch_id || 'global';
        if (branchStats[key]) {
          branchStats[key].count++;
          branchStats[key].total += sale.total;
        } else {
          branchStats[key] = { count: 1, total: sale.total, nombre: getBranchName(key) };
        }
      });
    }

    return { totalSales, totalRevenue, averageSale, paymentMethods, branchStats };
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
    const labels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    return labels[method] || method;
  };

  const openReturnModal = async (sale) => {
    try {
      const [returnsResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales/${sale.id}/returns`),
        axios.get(`${API}/products`)
      ]);

      const productNames = {};
      productsResponse.data.forEach(p => { productNames[p.id] = p.nombre; });

      const enrichedSale = {
        ...sale,
        items: sale.items.map(item => ({
          ...item,
          nombre: item.nombre || productNames[item.producto_id] || item.producto_id
        }))
      };

      const returnedQty = {};
      returnsResponse.data.forEach(ret => {
        ret.items.forEach(item => {
          returnedQty[item.producto_id] = (returnedQty[item.producto_id] || 0) + item.cantidad;
        });
      });

      const initialQty = {};
      const initialSelected = {};
      enrichedSale.items.forEach(item => {
        const available = item.cantidad - (returnedQty[item.producto_id] || 0);
        initialQty[item.producto_id] = available > 0 ? available : 0;
        initialSelected[item.producto_id] = false;
      });

      setReturnQuantities(initialQty);
      setReturnSelected(initialSelected);
      setReturnReason('');
      setReturnModal({ sale: enrichedSale, returnedQty });
    } catch {
      toast.error('Error al cargar información de devoluciones');
    }
  };

  const submitReturn = async () => {
    const items = returnModal.sale.items
      .filter(item => returnSelected[item.producto_id])
      .map(item => {
        const available = item.cantidad - (returnModal.returnedQty[item.producto_id] || 0);
        const cantidad = returnQuantities[item.producto_id] ?? available;
        return { producto_id: item.producto_id, cantidad };
      })
      .filter(item => item.cantidad > 0);

    if (items.length === 0) {
      toast.error('Seleccione al menos un producto para devolver');
      return;
    }

    setSubmittingReturn(true);
    try {
      const response = await axios.post(`${API}/sales/${returnModal.sale.id}/return`, {
        items,
        motivo: returnReason || null
      });
      toast.success(`Devolución ${response.data.numero_devolucion} procesada — $${response.data.total.toFixed(2)} devueltos al stock`);
      setReturnModal(null);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar la devolución');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleExportPDF = () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) return;
    setGeneratingPdf(true);
    try {
      const stats = calculateStats(filteredSales);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 20;
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
        pdf.text(label, margin + 2, yPos);
        pdf.text(value, colRight - 2, yPos, { align: 'right' });
        return yPos + 6;
      };

      // Encabezado
      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, W, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE VENTAS', W / 2, 13, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const periodoLabel = { today: 'Hoy', week: 'Última semana', month: 'Último mes', all: 'Todas', custom: 'Rango personalizado' }[dateFilter] || dateFilter;
      const sucursalLabel = branchFilter === 'all' ? 'Todas las sucursales' : getBranchName(branchFilter);
      pdf.text(`Período: ${periodoLabel}   |   Sucursal: ${sucursalLabel}   |   Generado: ${new Date().toLocaleDateString('es-ES')}`, W / 2, 22, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y = 34;

      // Resumen
      y = sectionTitle('RESUMEN', y);
      y = row('Total de ventas', stats.totalSales.toString(), y);
      y = row('Ingresos totales', `$${stats.totalRevenue.toFixed(2)}`, y, true);
      y = row('Venta promedio', `$${stats.averageSale.toFixed(2)}`, y);
      y += 4;

      // Métodos de pago
      y = sectionTitle('DESGLOSE POR MÉTODO DE PAGO', y);
      Object.entries(stats.paymentMethods).forEach(([method, data]) => {
        y = row(`${getPaymentMethodLabel(method)} (${data.count} ventas)`, `$${data.total.toFixed(2)}`, y);
      });
      y += 4;

      // Sucursales (si aplica)
      if (branchFilter === 'all' && Object.keys(stats.branchStats).length > 1) {
        y = sectionTitle('VENTAS POR SUCURSAL', y);
        Object.entries(stats.branchStats).forEach(([, data]) => {
          y = row(`${data.nombre} (${data.count} ventas)`, `$${data.total.toFixed(2)}`, y);
        });
        y += 4;
      }

      // Tabla
      y = sectionTitle('HISTORIAL DE VENTAS', y);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, colRight - margin, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Factura', margin + 2, y + 4);
      pdf.text('Fecha', margin + 35, y + 4);
      pdf.text('Sucursal', margin + 75, y + 4);
      pdf.text('Items', margin + 115, y + 4);
      pdf.text('Subtotal', margin + 130, y + 4);
      pdf.text('Total', colRight - 2, y + 4, { align: 'right' });
      y += 7;

      pdf.setFont('helvetica', 'normal');
      filteredSales.forEach((sale, i) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
        }
        pdf.setFontSize(8);
        pdf.text(sale.numero_factura || '-', margin + 2, y + 3);
        pdf.text(formatDate(sale.fecha), margin + 35, y + 3);
        pdf.text(getBranchName(sale.branch_id), margin + 75, y + 3);
        pdf.text(`${sale.items.length} prod.`, margin + 115, y + 3);
        pdf.text(`$${sale.subtotal.toFixed(2)}`, margin + 130, y + 3);
        pdf.text(`$${sale.total.toFixed(2)}`, colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });

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

      pdf.save(`reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportToCSV = () => {
    const filteredSales = getFilteredSales();
    const csvHeader = 'Factura,Fecha,Sucursal,Cajero,Total,Metodo Pago,Items\n';
    const csvRows = filteredSales.map(sale =>
      `${sale.numero_factura},${formatDate(sale.fecha)},${getBranchName(sale.branch_id)},${sale.cajero_id},${sale.total.toFixed(2)},${getPaymentMethodLabel(sale.metodo_pago)},${sale.items.length}`
    ).join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
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

  const getTopProducts = (salesData) => {
    const productTotals = {};
    salesData.forEach(sale => {
      if (sale.estado === 'cancelado') return;
      sale.items.forEach(item => {
        const key = item.producto_id;
        if (productTotals[key]) {
          productTotals[key].cantidad += item.cantidad;
          productTotals[key].total += item.precio_unitario * item.cantidad;
        } else {
          productTotals[key] = {
            nombre: item.nombre || item.producto_id,
            cantidad: item.cantidad,
            total: item.precio_unitario * item.cantidad
          };
        }
      });
    });
    return Object.values(productTotals)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
      .map(p => ({ ...p, nombre: p.nombre.length > 20 ? p.nombre.slice(0, 18) + '…' : p.nombre }));
  };

  const filteredSales = getFilteredSales();
  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const pagedSales = filteredSales.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const stats = calculateStats(filteredSales);
  const dailyData = getDailyData(filteredSales);
  const topProducts = getTopProducts(filteredSales);
  const paymentPieData = Object.entries(stats.paymentMethods).map(([method, data]) => ({
    name: getPaymentMethodLabel(method),
    value: parseFloat(data.total.toFixed(2)),
    fill: PAYMENT_COLORS[method] || '#6b7280'
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes de Ventas</h1>
          <p className="text-gray-600">Análisis y estadísticas de ventas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary flex items-center gap-2"
            disabled={filteredSales.length === 0 || generatingPdf}
          >
            <Printer className="w-4 h-4" />
            {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            disabled={filteredSales.length === 0}
          >
            <Download className="w-4 h-4" />
            Exportar CSV
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

          {/* Filtro usuario (solo admin/supervisor) */}
          {canFilterByUser && users.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                className="form-select"
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro sucursal */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            >
              <option value="all">Todas las sucursales</option>
              <option value="global">Sin sucursal</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro fecha */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              className="form-select"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
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
          <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-2">Revenue generado</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Venta Promedio</div>
            <div className="stat-icon"><TrendingUp className="w-6 h-6" /></div>
          </div>
          <div className="stat-value">${stats.averageSale.toFixed(2)}</div>
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
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total']} labelFormatter={(l) => `Fecha: ${l}`} />
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
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
                <div className="text-2xl font-bold text-green-600">${data.total.toFixed(2)}</div>
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
                <div className="text-2xl font-bold text-green-600">${data.total.toFixed(2)}</div>
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
                <th>Factura</th>
                <th>Fecha</th>
                <th>Sucursal</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Impuestos</th>
                <th>Total</th>
                <th>Método de Pago</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedSales.map(sale => (
                <tr key={sale.id}>
                  <td>
                    <span className="font-medium text-blue-600">{sale.numero_factura}</span>
                  </td>
                  <td>{formatDate(sale.fecha)}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Building2 className="w-3 h-3" />
                      {getBranchName(sale.branch_id)}
                    </span>
                  </td>
                  <td>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">
                      {sale.items.length} productos
                    </span>
                  </td>
                  <td>${sale.subtotal.toFixed(2)}</td>
                  <td>${sale.impuestos.toFixed(2)}</td>
                  <td>
                    <span className="font-semibold text-green-600">${sale.total.toFixed(2)}</span>
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
                  <td>
                    {sale.estado === 'cancelado' ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelada</span>
                    ) : sale.estado === 'devolucion_parcial' ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Dev. parcial</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Activa</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReprintSale(sale)}
                        className="btn btn-secondary btn-sm flex items-center gap-1"
                        title="Reimprimir ticket"
                      >
                        <Printer className="w-3 h-3" />
                        Ticket
                      </button>
                      {sale.estado !== 'cancelado' && (
                        <button
                          onClick={() => openReturnModal(sale)}
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          title="Procesar devolución"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Devolver
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
          onPageChange={setPage}
          itemName="ventas"
        />
      </div>

      {/* Reprint Ticket Modal */}
      {reprintSale && (
        <div className="ticket-modal-overlay">
          <div className="ticket-modal-container">
            <div className="ticket-modal-actions">
              <h3>Reimprimir Ticket</h3>
              <div className="ticket-modal-btns">
                <button onClick={printReprintTicket} className="btn btn-primary btn-sm">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button onClick={() => setReprintSale(null)} className="btn btn-secondary btn-sm">
                  <X className="w-4 h-4" />
                  Cerrar
                </button>
              </div>
            </div>

            <div id="ticket-print-area">
              {config?.company_logo && (
                <img src={config.company_logo} alt="logo" className="ticket-logo" />
              )}
              <div className="ticket-company-name">{config?.company_name || 'Mi Empresa'}</div>
              {config?.company_address && <div className="ticket-line">{config.company_address}</div>}
              {config?.company_phone && <div className="ticket-line">Tel: {config.company_phone}</div>}
              {config?.company_tax_id && <div className="ticket-line">CUIT: {config.company_tax_id}</div>}

              <div className="ticket-separator">{'- '.repeat(16)}</div>

              <div className="ticket-info-row">
                <span>Comprobante:</span>
                <span>{reprintSale.numero_factura}</span>
              </div>
              <div className="ticket-info-row">
                <span>Fecha:</span>
                <span>{new Date(reprintSale.fecha).toLocaleString('es-AR')}</span>
              </div>
              {getCajeroName(reprintSale.cajero_id) && (
                <div className="ticket-info-row">
                  <span>Cajero:</span>
                  <span>{getCajeroName(reprintSale.cajero_id)}</span>
                </div>
              )}
              <div className="ticket-info-row">
                <span>Pago:</span>
                <span>{getPaymentMethodLabel(reprintSale.metodo_pago)}</span>
              </div>

              <div className="ticket-separator">{'- '.repeat(16)}</div>

              <div className="ticket-items-header">
                <span>PRODUCTO</span>
                <span>TOTAL</span>
              </div>
              {reprintSale.items.map((item, idx) => (
                <div key={idx} className="ticket-item">
                  <div className="ticket-item-name">{item.nombre}</div>
                  <div className="ticket-item-detail">
                    <span>{item.cantidad} x {config?.currency_symbol || '$'}{item.precio_unitario.toFixed(2)}</span>
                    <span>{config?.currency_symbol || '$'}{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              <div className="ticket-separator">{'- '.repeat(16)}</div>

              <div className="ticket-total-row">
                <span>Subtotal:</span>
                <span>{config?.currency_symbol || '$'}{reprintSale.subtotal.toFixed(2)}</span>
              </div>
              {reprintSale.impuestos > 0 && (
                <div className="ticket-total-row">
                  <span>Impuestos ({((config?.tax_rate ?? 0) * 100).toFixed(0)}%):</span>
                  <span>{config?.currency_symbol || '$'}{reprintSale.impuestos.toFixed(2)}</span>
                </div>
              )}
              <div className="ticket-total-row ticket-total-final">
                <span>TOTAL:</span>
                <span>{config?.currency_symbol || '$'}{reprintSale.total.toFixed(2)}</span>
              </div>

              <div className="ticket-separator">{'- '.repeat(16)}</div>
              <div className="ticket-footer">
                {config?.receipt_footer_text || '¡Gracias por su compra!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <RotateCcw className="w-5 h-5 inline mr-2" />
                Devolución — {returnModal.sale.numero_factura}
              </h3>
              <button onClick={() => setReturnModal(null)} className="modal-close"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4">
              {/* Select all */}
              {(() => {
                const availableItems = returnModal.sale.items.filter(item => {
                  const available = item.cantidad - (returnModal.returnedQty[item.producto_id] || 0);
                  return available > 0;
                });
                const allSelected = availableItems.length > 0 && availableItems.every(item => returnSelected[item.producto_id]);
                return (
                  <label className="flex items-center gap-2 mb-3 p-2 bg-gray-100 rounded-lg cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => {
                        const next = {};
                        availableItems.forEach(item => { next[item.producto_id] = e.target.checked; });
                        setReturnSelected(prev => ({ ...prev, ...next }));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Devolver todo</span>
                  </label>
                );
              })()}

              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {returnModal.sale.items.map(item => {
                  const alreadyReturned = returnModal.returnedQty[item.producto_id] || 0;
                  const available = item.cantidad - alreadyReturned;
                  const isChecked = !!returnSelected[item.producto_id];
                  const exhausted = available <= 0;
                  return (
                    <div key={item.producto_id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isChecked ? 'bg-green-50 border-green-200' : exhausted ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-gray-50 border-gray-200'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={exhausted}
                        onChange={e => setReturnSelected(prev => ({ ...prev, [item.producto_id]: e.target.checked }))}
                        className="w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{item.nombre || item.producto_id}</div>
                        <div className="text-xs text-gray-500">
                          ${item.precio_unitario.toFixed(2)} c/u · {item.cantidad} en venta
                          {alreadyReturned > 0 && <span className="ml-1 text-orange-600">· {alreadyReturned} ya devueltos</span>}
                          {exhausted && <span className="ml-1 text-gray-400">· ya devuelto</span>}
                        </div>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max={available}
                            value={returnQuantities[item.producto_id] ?? available}
                            onChange={e => setReturnQuantities(prev => ({
                              ...prev,
                              [item.producto_id]: Math.min(available, Math.max(1, parseInt(e.target.value) || 1))
                            }))}
                            className="form-input w-16 text-center text-sm"
                          />
                          <span className="text-xs text-gray-400">/ {available}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Motivo (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Producto defectuoso, error en pedido..."
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>

              {(() => {
                const total = returnModal.sale.items.reduce((sum, item) => {
                  if (!returnSelected[item.producto_id]) return sum;
                  const qty = returnQuantities[item.producto_id] ?? (item.cantidad - (returnModal.returnedQty[item.producto_id] || 0));
                  return sum + qty * item.precio_unitario;
                }, 0);
                return total > 0 ? (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-800">
                    <strong>Total a devolver: </strong>${total.toFixed(2)}
                  </div>
                ) : null;
              })()}

              <div className="flex justify-end gap-3">
                <button onClick={() => setReturnModal(null)} className="btn btn-secondary">Cancelar</button>
                <button
                  onClick={submitReturn}
                  disabled={submittingReturn || !Object.values(returnSelected).some(Boolean)}
                  className="btn btn-primary"
                >
                  {submittingReturn ? (
                    <><div className="spinner w-4 h-4" /> Procesando...</>
                  ) : (
                    <><RotateCcw className="w-4 h-4" /> Confirmar Devolución</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReports;
