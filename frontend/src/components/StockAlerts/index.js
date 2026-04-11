import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import StockAlertsView from './StockAlertsView';

const ITEMS_PER_PAGE = 20;

const StockAlerts = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [modal, setModal] = useState({ open: false, item: null, action: null, value: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlerts(currentPage);
  }, [currentPage]);

  const fetchAlerts = async (page) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/dashboard/stock-alerts`, {
        params: { page, per_page: ITEMS_PER_PAGE }
      });
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Error al cargar alertas de stock');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const response = await axios.get(`${API}/dashboard/stock-alerts/export`, {
        params: { format: 'xlsx' },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stock_bajo.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      // Fetch all items for PDF
      const response = await axios.get(`${API}/dashboard/stock-alerts`, {
        params: { page: 1, per_page: 10000 }
      });
      const allItems = response.data.items;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297;
      const margin = 15;
      const colRight = W - margin;
      let y = 0;

      // Header
      pdf.setFillColor(20, 20, 20);
      pdf.rect(0, 0, W, 24, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRODUCTOS CON STOCK BAJO', W / 2, 10, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const now = new Date().toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).replace(/[^\x00-\xFF]/g, '');
      pdf.text('Generado: ' + now, W / 2, 18, { align: 'center' });
      if (user?.rol === 'admin') {
        pdf.text('Alcance: Todas las sucursales', margin, 18);
      }
      pdf.setTextColor(0, 0, 0);

      y = 32;

      // Summary box
      pdf.setFillColor(254, 242, 242);
      pdf.rect(margin, y, colRight - margin, 10, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(185, 28, 28);
      pdf.text('Total de productos con stock bajo: ' + allItems.length, margin + 4, y + 7);
      pdf.setTextColor(0, 0, 0);

      y += 16;

      // Table header
      const cols = user?.rol === 'admin'
        ? [
            { label: 'Producto', x: margin, w: 80 },
            { label: 'Sucursal', x: margin + 80, w: 55 },
            { label: 'Stock Actual', x: margin + 135, w: 35 },
            { label: 'Stock Minimo', x: margin + 170, w: 35 },
            { label: 'Diferencia', x: margin + 205, w: 35 }
          ]
        : [
            { label: 'Producto', x: margin, w: 110 },
            { label: 'Stock Actual', x: margin + 110, w: 50 },
            { label: 'Stock Minimo', x: margin + 160, w: 50 },
            { label: 'Diferencia', x: margin + 210, w: 50 }
          ];

      pdf.setFillColor(40, 40, 40);
      pdf.rect(margin, y, colRight - margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      cols.forEach(col => pdf.text(col.label, col.x + 2, y + 5.5));
      pdf.setTextColor(0, 0, 0);

      y += 10;

      // Rows
      pdf.setFontSize(8);
      allItems.forEach((item, i) => {
        if (y > 185) {
          pdf.addPage();
          y = 15;
        }

        const rowH = 7;
        if (i % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, y - 1, colRight - margin, rowH, 'F');
        }

        const diff = item.stock - item.stock_minimo;
        pdf.setFont('helvetica', 'normal');

        const safeNombre = String(item.nombre || '');
        const safeSucursal = String(item.sucursal || '-');

        if (user?.rol === 'admin') {
          const nombre = safeNombre.length > 35 ? safeNombre.substring(0, 35) + '...' : safeNombre;
          pdf.text(nombre, margin + 2, y + 4.5);
          pdf.text(safeSucursal, margin + 82, y + 4.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(185, 28, 28);
          pdf.text(String(item.stock), margin + 137, y + 4.5);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.text(String(item.stock_minimo), margin + 172, y + 4.5);
          pdf.setTextColor(diff < 0 ? 185 : 0, 28, 28);
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(diff), margin + 207, y + 4.5);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
        } else {
          const nombre = safeNombre.length > 50 ? safeNombre.substring(0, 50) + '...' : safeNombre;
          pdf.text(nombre, margin + 2, y + 4.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(185, 28, 28);
          pdf.text(String(item.stock), margin + 112, y + 4.5);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.text(String(item.stock_minimo), margin + 162, y + 4.5);
          pdf.setTextColor(diff < 0 ? 185 : 0, 28, 28);
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(diff), margin + 212, y + 4.5);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
        }

        // bottom line
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, y + rowH - 1, colRight, y + rowH - 1);
        y += rowH;
      });

      // Footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Pagina ' + i + ' de ' + pageCount, W / 2, 205, { align: 'center' });
      }

      pdf.save('stock_bajo.pdf');
      toast.success('PDF generado correctamente');
    } catch (error) {
      toast.error('Error al generar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const openModal = (item, action) => {
    setModal({ open: true, item, action, value: action === 'stock_minimo' ? String(item.stock_minimo) : '' });
  };

  const closeModal = () => setModal({ open: false, item: null, action: null, value: '' });

  const handleSave = async () => {
    const { item, action, value } = modal;
    const numVal = parseInt(value, 10);
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Ingresa un valor válido');
      return;
    }
    setSaving(true);
    try {
      const updateData = action === 'stock_minimo'
        ? { stock_minimo: numVal }
        : { stock: item.stock + numVal };
      await axios.put(`${API}/branch-products/${item.branch_product_id}`, updateData);
      toast.success(action === 'stock_minimo' ? 'Stock mínimo actualizado' : 'Stock actualizado');
      closeModal();
      fetchAlerts(currentPage);
      window.dispatchEvent(new CustomEvent('stock-updated'));
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const getDiffColor = (diff) => {
    if (diff < 0) return 'text-red-700 font-bold';
    return 'text-yellow-700 font-semibold';
  };

  const handleModalValueChange = (value) => {
    setModal(m => ({ ...m, value }));
  };

  return (
    <StockAlertsView
      user={user}
      items={items}
      total={total}
      totalPages={totalPages}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      loading={loading}
      exportingExcel={exportingExcel}
      exportingPdf={exportingPdf}
      modal={modal}
      saving={saving}
      ITEMS_PER_PAGE={ITEMS_PER_PAGE}
      onRefresh={() => fetchAlerts(currentPage)}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
      onOpenModal={openModal}
      onCloseModal={closeModal}
      onSave={handleSave}
      onModalValueChange={handleModalValueChange}
      getDiffColor={getDiffColor}
    />
  );
};

export default StockAlerts;
