import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { API, AuthContext } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import { formatAmount, parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import SalesReportsView from './SalesReportsView';

const PAYMENT_COLORS = {
  efectivo: '#16a34a',
  tarjeta: '#2563eb',
  transferencia: '#7c3aed'
};

const SalesReports = () => {
  const { user: currentUser, activeBranch } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const fromCaja = searchParams.get('from') === 'caja';
  const canFilterByUser = ['admin', 'supervisor'].includes(currentUser?.rol);
  const isCajero = currentUser?.rol === 'cajero';

  const [sales, setSales] = useState([]);
  const [allReturns, setAllReturns] = useState([]);
  const [allCreditNotes, setAllCreditNotes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [afipConfig, setAfipConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const cajeroDefaultBranch = activeBranch?.id || currentUser?.active_branch_id || null;
  const [branchFilter, setBranchFilter] = useState(
    (fromCaja || isCajero) && cajeroDefaultBranch ? cajeroDefaultBranch : 'all'
  );
  const [userFilter, setUserFilter] = useState(
    (fromCaja || isCajero) ? (currentUser?.id || 'all') : 'all'
  );
  const [page, setPage] = useState(1);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [returnModal, setReturnModal] = useState(null);
  const [reprintSale, setReprintSale] = useState(null);
  const [reprintReturns, setReprintReturns] = useState([]);
  const [retryingAfip, setRetryingAfip] = useState(null);
  const [retryingAfipNc, setRetryingAfipNc] = useState(null);

  useEffect(() => {
    if (isCajero && activeBranch?.id) {
      setBranchFilter(activeBranch.id);
      setPage(1);
    }
  }, [activeBranch?.id]);

  useEffect(() => {
    fetchSales();
    fetchBranches();
    fetchConfiguration();
    fetchAfipConfig();
    if (canFilterByUser) fetchUsers();
  }, []);

  const fetchSales = async () => {
    try {
      const [salesRes, returnsRes, creditNotesRes] = await Promise.all([
        axios.get(`${API}/sales`),
        axios.get(`${API}/returns`),
        axios.get(`${API}/credit-notes`),
      ]);
      setSales(salesRes.data);
      setAllReturns(returnsRes.data);
      setAllCreditNotes(creditNotesRes.data);
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
      if (response.data.length === 1 && !fromCaja) {
        setBranchFilter(response.data[0].id);
      }
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

  const fetchAfipConfig = async () => {
    try {
      const response = await axios.get(`${API}/afip/config`);
      setAfipConfig(response.data);
    } catch (error) {
      // AFIP not configured — not critical
    }
  };

  const TIPO_CBTE_NOMBRES = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' };

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

    if (branchFilter !== 'all') {
      filteredSales = filteredSales.filter(sale => sale.branch_id === branchFilter);
    }

    if (userFilter !== 'all') {
      filteredSales = filteredSales.filter(sale => sale.cajero_id === userFilter);
    }

    const utcMidnight = (y, m, d) => new Date(Date.UTC(y, m, d));

    switch (dateFilter) {
      case 'today': {
        const today = utcMidnight(now.getFullYear(), now.getMonth(), now.getDate());
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= today);
        break;
      }
      case 'week': {
        const weekAgo = utcMidnight(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = utcMidnight(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredSales = filteredSales.filter(sale => new Date(sale.fecha) >= monthAgo);
        break;
      }
      case 'custom':
        if (customDateFrom && customDateTo) {
          const [fy, fm, fd] = customDateFrom.split('-').map(Number);
          const [ty, tm, td] = customDateTo.split('-').map(Number);
          const fromDate = utcMidnight(fy, fm - 1, fd);
          const toDate = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999));
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

  const calculateStats = (salesData, netTotals = {}) => {
    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, sale) => sum + Math.max(0, sale.total - (netTotals[sale.id] || 0)), 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const paymentMethods = {};
    salesData.forEach(sale => {
      const net = sale.total - (netTotals[sale.id] || 0);
      if (paymentMethods[sale.metodo_pago]) {
        paymentMethods[sale.metodo_pago].count++;
        paymentMethods[sale.metodo_pago].total += net;
      } else {
        paymentMethods[sale.metodo_pago] = { count: 1, total: net };
      }
    });

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
    const date = parseApiDate(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  };

  const getPaymentMethodLabel = (method) => {
    const labels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    return labels[method] || method;
  };

  const handleRetryAfip = async (saleId) => {
    setRetryingAfip(saleId);
    try {
      const response = await axios.post(`${API}/afip/reintentar/${saleId}`);
      toast.success(`CAE obtenido: ${response.data.cae}`);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al reintentar con AFIP');
    } finally {
      setRetryingAfip(null);
    }
  };

  const handleRetryAfipNc = async (creditNoteId, tipoComprobante = null) => {
    let cuitReceptor = null;
    if (tipoComprobante === 3) {
      const input = window.prompt('Nota de Crédito A requiere CUIT del receptor.\nIngrese el CUIT (ej: 20-12345678-9):');
      if (input === null) return;
      cuitReceptor = input.trim();
      if (!cuitReceptor) {
        toast.error('El CUIT es obligatorio para Nota de Crédito A');
        return;
      }
    }
    setRetryingAfipNc(creditNoteId);
    try {
      const body = cuitReceptor ? { cuit_receptor: cuitReceptor } : {};
      const response = await axios.post(`${API}/afip/reintentar-nc/${creditNoteId}`, body);
      toast.success(`CAE de NC obtenido: ${response.data.cae}`);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al reintentar CAE de nota de crédito');
    } finally {
      setRetryingAfipNc(null);
    }
  };

  const openReturnModal = async (sale) => {
    try {
      const [returnsResponse, productsResponse] = await Promise.all([
        axios.get(`${API}/sales/${sale.id}/returns`),
        axios.get(`${API}/products`, { params: { page: 1, per_page: 10000 } })
      ]);

      const productNames = {};
      (productsResponse.data.items || productsResponse.data).forEach(p => { productNames[p.id] = p.nombre; });

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

      setReturnModal({ sale: enrichedSale, returnedQty });
    } catch {
      toast.error('Error al cargar información de devoluciones');
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

      y = sectionTitle('RESUMEN', y);
      y = row('Total de ventas', stats.totalSales.toString(), y);
      y = row('Ingresos totales', `$${formatAmount(stats.totalRevenue)}`, y, true);
      y = row('Venta promedio', `$${formatAmount(stats.averageSale)}`, y);
      y += 4;

      y = sectionTitle('DESGLOSE POR MÉTODO DE PAGO', y);
      Object.entries(stats.paymentMethods).forEach(([method, data]) => {
        y = row(`${getPaymentMethodLabel(method)} (${data.count} ventas)`, `$${formatAmount(data.total)}`, y);
      });
      y += 4;

      if (branchFilter === 'all' && Object.keys(stats.branchStats).length > 1) {
        y = sectionTitle('VENTAS POR SUCURSAL', y);
        Object.entries(stats.branchStats).forEach(([, data]) => {
          y = row(`${data.nombre} (${data.count} ventas)`, `$${formatAmount(data.total)}`, y);
        });
        y += 4;
      }

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
        pdf.text(`$${formatAmount(sale.subtotal)}`, margin + 130, y + 3);
        pdf.text(`$${formatAmount(sale.total)}`, colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });

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

  const exportToXLSX = () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) return;
    const rows = filteredSales.map(sale => ({
      Factura: sale.numero_factura,
      Fecha: formatDate(sale.fecha),
      Sucursal: getBranchName(sale.branch_id),
      Cajero: getCajeroName(sale.cajero_id) || sale.cajero_id,
      Total: sale.total,
      'Metodo Pago': getPaymentMethodLabel(sale.metodo_pago),
      Items: sale.items.length,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 22 },
      { wch: 12 }, { wch: 16 }, { wch: 8 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reporte exportado exitosamente');
  };

  const getDailyData = (data) => {
    const byDay = {};
    data.forEach(item => {
      const net = Math.max(0, item.total - (saleNetTotal[item.id] || 0));
      const d = new Date(item.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (byDay[key]) {
        byDay[key].total += net;
        byDay[key].count++;
      } else {
        byDay[key] = { fecha: label, total: net, count: 1, key };
      }
    });
    return Object.values(byDay).sort((a, b) => a.key.localeCompare(b.key));
  };

  const getTopProducts = (salesData) => {
    // Acumular totales vendidos
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

    // Restar devoluciones globales por producto
    const saleIds = new Set(salesData.map(s => s.id));
    allReturns.forEach(ret => {
      if (!saleIds.has(ret.sale_id)) return;
      ret.items.forEach(item => {
        if (productTotals[item.producto_id]) {
          productTotals[item.producto_id].cantidad -= item.cantidad;
          productTotals[item.producto_id].total -= item.precio_unitario * item.cantidad;
        }
      });
    });

    return Object.values(productTotals)
      .filter(p => p.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
      .map(p => ({ ...p, nombre: p.nombre.length > 20 ? p.nombre.slice(0, 18) + '…' : p.nombre }));
  };

  const filteredSales = getFilteredSales();
  const { sortedItems: sortedSales, sortConfig, requestSort } = useSortableData(filteredSales);
  const itemsPerPage = config?.items_per_page || 10;
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage);
  const pagedSales = sortedSales.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Mapa de total neto por venta (total original - devoluciones)
  const saleNetTotal = {};
  allReturns.forEach(ret => {
    saleNetTotal[ret.sale_id] = (saleNetTotal[ret.sale_id] || 0) + ret.total;
  });

  // Mapa de notas de crédito por venta
  const saleCreditNotesMap = {};
  allCreditNotes.forEach(nc => {
    if (!saleCreditNotesMap[nc.sale_id]) saleCreditNotesMap[nc.sale_id] = [];
    saleCreditNotesMap[nc.sale_id].push(nc);
  });
  const stats = calculateStats(filteredSales, saleNetTotal);
  const dailyData = getDailyData(filteredSales);
  const topProducts = getTopProducts(filteredSales);
  const paymentPieData = Object.entries(stats.paymentMethods).map(([method, data]) => ({
    name: getPaymentMethodLabel(method),
    value: parseFloat(data.total.toFixed(2)),
    fill: PAYMENT_COLORS[method] || '#6b7280'
  }));

  const handleReprintSale = async (sale) => {
    setReprintSale(sale);
    if (sale.estado === 'devolucion_parcial') {
      try {
        const res = await axios.get(`${API}/sales/${sale.id}/returns`);
        setReprintReturns(res.data);
      } catch {
        setReprintReturns([]);
      }
    } else {
      setReprintReturns([]);
    }
  };

  return (
    <SalesReportsView
      loading={loading}
      sales={sales}
      branches={branches}
      users={users}
      config={config}
      afipConfig={afipConfig}
      generatingPdf={generatingPdf}
      dateFilter={dateFilter}
      branchFilter={branchFilter}
      userFilter={userFilter}
      page={page}
      customDateFrom={customDateFrom}
      customDateTo={customDateTo}
      returnModal={returnModal}
      reprintSale={reprintSale}
      reprintReturns={reprintReturns}
      retryingAfip={retryingAfip}
      fromCaja={fromCaja}
      canFilterByUser={canFilterByUser}
      currentUser={currentUser}
      filteredSales={sortedSales}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      pagedSales={pagedSales}
      sortConfig={sortConfig}
      requestSort={requestSort}
      stats={stats}
      dailyData={dailyData}
      topProducts={topProducts}
      paymentPieData={paymentPieData}
      saleNetTotal={saleNetTotal}
      allCreditNotes={allCreditNotes}
      saleCreditNotesMap={saleCreditNotesMap}
      TIPO_CBTE_NOMBRES={TIPO_CBTE_NOMBRES}
      onSetDateFilter={(val) => { setDateFilter(val); setPage(1); }}
      onSetBranchFilter={(val) => { setBranchFilter(val); setPage(1); }}
      onSetUserFilter={(val) => { setUserFilter(val); setPage(1); }}
      onSetPage={setPage}
      onSetCustomDateFrom={setCustomDateFrom}
      onSetCustomDateTo={setCustomDateTo}
      onSetReturnModal={setReturnModal}
      onSetReprintSale={setReprintSale}
      onSetReprintReturns={setReprintReturns}
      onHandleReprintSale={handleReprintSale}
      onHandleExportPDF={handleExportPDF}
      onExportToXLSX={exportToXLSX}
      onOpenReturnModal={openReturnModal}
      onHandleRetryAfip={handleRetryAfip}
      retryingAfipNc={retryingAfipNc}
      onHandleRetryAfipNc={handleRetryAfipNc}
      onFetchSales={fetchSales}
      onPrintReprintTicket={printReprintTicket}
      getBranchName={getBranchName}
      getCajeroName={getCajeroName}
      getPaymentMethodLabel={getPaymentMethodLabel}
      formatDate={formatDate}
      formatAmount={formatAmount}
    />
  );
};

export default SalesReports;
