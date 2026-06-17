import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { useSortableData } from '../../hooks/useSortableData';
import { formatAmount } from '../../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import ProductsSoldReportView from './ProductsSoldReportView';

const ProductsSoldReport = () => {
  const [reportData, setReportData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState('month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [productoFilter, setProductoFilter] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const getDateRange = useCallback(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Usa fecha local (Argentina) para alinear con cómo se almacenan las fechas en la BD
    const localStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = localStr(now);
    switch (dateFilter) {
      case 'today':
        return { desde: today, hasta: today };
      case 'week': {
        const w = new Date(now);
        w.setDate(now.getDate() - 7);
        return { desde: localStr(w), hasta: today };
      }
      case 'month': {
        const m = new Date(now);
        m.setMonth(now.getMonth() - 1);
        return { desde: localStr(m), hasta: today };
      }
      case 'all':
        return { desde: '2020-01-01', hasta: today };
      case 'custom':
        return customDateFrom && customDateTo
          ? { desde: customDateFrom, hasta: customDateTo }
          : null;
      default:
        return null;
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    axios.get(`${API}/branches`)
      .then(r => {
        setBranches(r.data);
        if (r.data.length === 1) setBranchFilter(r.data[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    const range = getDateRange();
    if (!range) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reportes/productos-vendidos`, {
        params: { fecha_desde: range.desde, fecha_hasta: range.hasta },
      });
      setReportData(res.data);
      setCategoriaFilter('all');
      setProductoFilter('all');
      setPage(1);
    } catch {
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBranchName = (id) => {
    const b = branches.find(b => b.id === id);
    return b ? b.nombre : id;
  };

  const categorias = Array.from(
    new Map(
      reportData
        .filter(p => p.categoria_id)
        .map(p => [p.categoria_id, p.categoria_nombre])
    ).entries()
  ).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const productosParaFiltro = Array.from(
    new Map(
      reportData
        .filter(p => categoriaFilter === 'all' || p.categoria_id === categoriaFilter)
        .map(p => [p.nombre.toLowerCase(), p.nombre])
    ).entries()
  )
    .map(([, nombre]) => ({ nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getFilteredData = () => {
    let filtered = [...reportData];
    if (branchFilter !== 'all') {
      filtered = filtered.filter(p => p.branch_id === branchFilter);
    }
    if (categoriaFilter !== 'all') {
      filtered = filtered.filter(p => p.categoria_id === categoriaFilter);
    }
    if (productoFilter !== 'all') {
      filtered = filtered.filter(p => p.nombre.toLowerCase() === productoFilter);
    }
    return filtered;
  };

  const handleCategoriaChange = (val) => {
    setCategoriaFilter(val);
    setProductoFilter('all');
    setPage(1);
  };

  const handleProductoChange = (val) => {
    // val = nombre en minúsculas o 'all'
    setProductoFilter(val);
    setPage(1);
  };

  const handleBranchChange = (val) => {
    setBranchFilter(val);
    setPage(1);
  };

  const calculateStats = (data) => {
    const totalProductos = data.length;
    const totalUnidades = data.reduce((s, p) => s + p.cantidad_vendida, 0);
    const totalRecaudado = data.reduce((s, p) => s + p.total_recaudado, 0);
    return { totalProductos, totalUnidades, totalRecaudado };
  };

  const handleExportPDF = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return;
    setGeneratingPdf(true);
    try {
      const stats = calculateStats(filtered);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297;
      const margin = 15;
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
      pdf.text('REPORTE DE PRODUCTOS VENDIDOS', W / 2, 13, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const periodoLabel = { today: 'Hoy', week: 'Última semana', month: 'Último mes', all: 'Todas las fechas', custom: 'Rango personalizado' }[dateFilter] || dateFilter;
      const sucursalLabel = branchFilter === 'all' ? 'Todas las sucursales' : getBranchName(branchFilter);
      pdf.text(`Período: ${periodoLabel}   |   Sucursal: ${sucursalLabel}   |   Generado: ${new Date().toLocaleDateString('es-ES')}`, W / 2, 22, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y = 34;

      y = sectionTitle('RESUMEN', y);
      y = row('Productos distintos', stats.totalProductos.toString(), y);
      y = row('Total unidades vendidas', stats.totalUnidades.toFixed(2), y);
      y = row('Total recaudado', `$${formatAmount(stats.totalRecaudado)}`, y, true);
      y += 4;

      y = sectionTitle('DETALLE POR PRODUCTO', y);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, colRight - margin, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Producto', margin + 2, y + 4);
      pdf.text('Categoría', margin + 90, y + 4);
      pdf.text('Cantidad', margin + 150, y + 4);
      pdf.text('Precio Prom.', margin + 175, y + 4);
      pdf.text('N° Ventas', margin + 205, y + 4);
      pdf.text('Total', colRight - 2, y + 4, { align: 'right' });
      y += 7;

      pdf.setFont('helvetica', 'normal');
      filtered.forEach((p, i) => {
        if (y > 185) { pdf.addPage(); y = 15; }
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, y - 1, colRight - margin, 6, 'F');
        }
        pdf.setFontSize(8);
        const nombre = p.nombre.length > 40 ? p.nombre.slice(0, 38) + '…' : p.nombre;
        pdf.text(nombre, margin + 2, y + 3);
        pdf.text(p.categoria_nombre, margin + 90, y + 3);
        pdf.text(p.cantidad_vendida.toFixed(2), margin + 150, y + 3);
        pdf.text(`$${formatAmount(p.precio_promedio)}`, margin + 175, y + 3);
        pdf.text(p.num_ventas.toString(), margin + 205, y + 3);
        pdf.text(`$${formatAmount(p.total_recaudado)}`, colRight - 2, y + 3, { align: 'right' });
        y += 6;
      });

      const totalPages = pdf.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        line(200);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, 205);
        pdf.text(`Página ${p} de ${totalPages}`, colRight, 205, { align: 'right' });
      }

      pdf.save(`productos-vendidos-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportToXLSX = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return;
    const rows = filtered.map(p => ({
      Producto: p.nombre,
      Categoría: p.categoria_nombre,
      'Cantidad Vendida': p.cantidad_vendida,
      'Precio Promedio': p.precio_promedio,
      'N° de Ventas': p.num_ventas,
      'Total Recaudado': p.total_recaudado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos Vendidos');
    XLSX.writeFile(wb, `productos-vendidos-${dateFilter}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reporte exportado exitosamente');
  };

  const filteredData = loading ? [] : getFilteredData();
  const { sortedItems, sortConfig, requestSort } = useSortableData(filteredData);
  const stats = calculateStats(filteredData);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const pagedItems = sortedItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const topProductos = [...filteredData]
    .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
    .slice(0, 10)
    .map(p => ({ nombre: p.nombre.length > 20 ? p.nombre.slice(0, 18) + '…' : p.nombre, cantidad: p.cantidad_vendida }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <ProductsSoldReportView
      pagedItems={pagedItems}
      sortedItems={sortedItems}
      sortConfig={sortConfig}
      requestSort={requestSort}
      stats={stats}
      topProductos={topProductos}
      branches={branches}
      categorias={categorias}
      productosParaFiltro={productosParaFiltro}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      branchFilter={branchFilter}
      setBranchFilter={handleBranchChange}
      categoriaFilter={categoriaFilter}
      setCategoriaFilter={handleCategoriaChange}
      productoFilter={productoFilter}
      setProductoFilter={handleProductoChange}
      customDateFrom={customDateFrom}
      setCustomDateFrom={setCustomDateFrom}
      customDateTo={customDateTo}
      setCustomDateTo={setCustomDateTo}
      generatingPdf={generatingPdf}
      handleExportPDF={handleExportPDF}
      exportToXLSX={exportToXLSX}
      formatAmount={formatAmount}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      itemsPerPage={itemsPerPage}
    />
  );
};

export default ProductsSoldReport;
