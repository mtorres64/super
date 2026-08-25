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

const EMPTY_STATS = { totalSales: 0, totalRevenue: 0, averageSale: 0, paymentMethods: {}, branchStats: {} };

// Tope de filas para exportar PDF/Excel: el reporte en sí pagina en el backend
// (ver fetchSales), pero exportar tiene que traer TODAS las ventas del período
// elegido, no solo la página visible. Se acota para no pedir un documento de
// decenas de miles de filas de una sola vez.
const EXPORT_LIMIT = 5000;

const SalesReports = () => {
  const { user: currentUser, activeBranch } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const fromCaja = searchParams.get('from') === 'caja';
  const canFilterByUser = ['admin', 'supervisor'].includes(currentUser?.rol);
  const isCajero = currentUser?.rol === 'cajero';

  // `items`: solo la página actual (detalle completo, para la tabla/acciones).
  // `total`/`stats`/`dailyData`/`topProducts`/`creditNotes`: calculados en el
  // backend sobre TODO el rango filtrado, no solo la página — ver /reportes/ventas.
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [dailyData, setDailyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const resetFilters = () => {
    setDateFilter('today');
    setBranchFilter('all');
    setUserFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSearchQuery('');
    setPage(1);
  };
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
    fetchBranches();
    fetchConfiguration();
    fetchAfipConfig();
    if (canFilterByUser) fetchUsers();
  }, []);

  // Debounce de la búsqueda: ahora cada tecla implica una request al backend
  // (antes filtraba en memoria sobre lo ya cargado), así que esperamos a que
  // el usuario termine de tipear en vez de pedir en cada cambio.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const itemsPerPage = config?.items_per_page || 10;

  useEffect(() => {
    fetchSales();
  }, [dateFilter, customDateFrom, customDateTo, branchFilter, userFilter, debouncedSearch, page, itemsPerPage]);

  // Igual que en MargensReport/IncomeExpenseReport: traducimos el filtro de fecha de
  // la UI a un rango concreto para pedirle al backend solo esas ventas, en vez de
  // traer el historial completo (eso era lo que tumbaba la instancia por memoria).
  // "Todas" ahora significa "último año" — el mismo tope que exige el backend en
  // /reportes/ventas (_validar_rango_fechas, max_dias=366) para no traer años enteros
  // de historial de una sola vez.
  const getDateRangeParams = () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (dateFilter) {
      case 'today':
        return { desde: fmt(today), hasta: fmt(today) };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { desde: fmt(weekAgo), hasta: fmt(today) };
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { desde: fmt(monthAgo), hasta: fmt(today) };
      }
      case 'all': {
        const yearAgo = new Date(today);
        yearAgo.setDate(yearAgo.getDate() - 365);
        return { desde: fmt(yearAgo), hasta: fmt(today) };
      }
      case 'custom':
        if (!customDateFrom || !customDateTo) return null;
        return { desde: customDateFrom, hasta: customDateTo };
      default:
        return null;
    }
  };

  const buildParams = (extra = {}) => {
    const range = getDateRangeParams();
    if (!range) return null;
    const params = { fecha_desde: range.desde, fecha_hasta: range.hasta, ...extra };
    if (branchFilter !== 'all') params.branch_id = branchFilter;
    if (userFilter !== 'all') params.cajero_id = userFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  };

  const fetchSales = async () => {
    const params = buildParams({ page, per_page: itemsPerPage });
    if (!params) return; // "custom" esperando a que elijan ambas fechas
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reportes/ventas`, { params });
      setItems(res.data.items);
      setTotal(res.data.total);
      setStats(res.data.stats);
      setDailyData(res.data.daily);
      setTopProducts(res.data.topProducts);
      setCreditNotes(res.data.creditNotes);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  // Trae TODAS las ventas que matchean el filtro actual (no solo la página visible)
  // para exportar PDF/Excel. Usa el mismo endpoint pero sin paginar, acotado a
  // EXPORT_LIMIT filas.
  const fetchAllForExport = async () => {
    const params = buildParams({ page: 1, per_page: EXPORT_LIMIT });
    if (!params) return null;
    const res = await axios.get(`${API}/reportes/ventas`, { params });
    if (res.data.total > EXPORT_LIMIT) {
      toast.info(`El período tiene ${res.data.total} ventas; se exportaron las primeras ${EXPORT_LIMIT}. Achicá el rango para exportar todo.`);
    }
    return res.data.items;
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

  const handleExportPDF = async () => {
    if (total === 0) return;
    setGeneratingPdf(true);
    try {
      const allSales = await fetchAllForExport();
      if (!allSales) return;

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
      const periodoLabel = { today: 'Hoy', week: 'Última semana', month: 'Último mes', all: 'Último año', custom: 'Rango personalizado' }[dateFilter] || dateFilter;
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
      allSales.forEach((sale, i) => {
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

  const exportToXLSX = async () => {
    if (total === 0) return;
    try {
      const allSales = await fetchAllForExport();
      if (!allSales) return;
      const rows = allSales.map(sale => ({
        Factura: sale.numero_factura,
        Fecha: formatDate(sale.fecha),
        Sucursal: getBranchName(sale.branch_id),
        Cajero: getCajeroName(sale.cajero_id) || sale.cajero_id,
        Total: sale.total,
        'Metodo Pago': sale.pagos?.length > 1
          ? sale.pagos.map(p => `${getPaymentMethodLabel(p.metodo)} $${p.monto}`).join(' + ')
          : getPaymentMethodLabel(sale.metodo_pago),
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
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };

  const { sortedItems, sortConfig, requestSort } = useSortableData(items);
  const totalPages = Math.ceil(total / itemsPerPage);

  // Mapa de notas de crédito por venta (para el badge en la fila de la tabla).
  // `creditNotes` ya viene acotado por el backend a las ventas del rango filtrado.
  const saleCreditNotesMap = {};
  creditNotes.forEach(nc => {
    if (!saleCreditNotesMap[nc.sale_id]) saleCreditNotesMap[nc.sale_id] = [];
    saleCreditNotesMap[nc.sale_id].push(nc);
  });

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
      totalCount={total}
      itemsPerPage={itemsPerPage}
      totalPages={totalPages}
      pagedSales={sortedItems}
      sortConfig={sortConfig}
      requestSort={requestSort}
      stats={stats}
      dailyData={dailyData}
      topProducts={topProducts}
      paymentPieData={paymentPieData}
      creditNotes={creditNotes}
      saleCreditNotesMap={saleCreditNotesMap}
      TIPO_CBTE_NOMBRES={TIPO_CBTE_NOMBRES}
      searchQuery={searchQuery}
      onSetSearchQuery={(val) => { setSearchQuery(val); setPage(1); }}
      onSetDateFilter={(val) => { setDateFilter(val); setPage(1); }}
      onSetBranchFilter={(val) => { setBranchFilter(val); setPage(1); }}
      onSetUserFilter={(val) => { setUserFilter(val); setPage(1); }}
      onSetPage={setPage}
      onSetCustomDateFrom={(val) => { setCustomDateFrom(val); setPage(1); }}
      onSetCustomDateTo={(val) => { setCustomDateTo(val); setPage(1); }}
      onResetFilters={resetFilters}
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
