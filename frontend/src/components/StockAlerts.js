import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import Pagination from './Pagination';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  Package
} from 'lucide-react';

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

  const getDiffColor = (diff) => {
    if (diff < 0) return 'text-red-700 font-bold';
    return 'text-yellow-700 font-semibold';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Productos con Stock Bajo
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user?.rol === 'admin'
                ? 'Todas las sucursales'
                : 'Tu sucursal'}
              {!loading && ` · ${total} producto${total !== 1 ? 's' : ''} requieren atención`}
            </p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAlerts(currentPage)}
            className="btn btn-secondary flex items-center gap-2"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || total === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {exportingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || total === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Package className="w-12 h-12 mb-3 text-green-300" />
            <p className="text-lg font-medium text-gray-600">¡Todo en orden!</p>
            <p className="text-sm mt-1">No hay productos con stock bajo en este momento.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    {user?.rol === 'admin' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sucursal
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Mínimo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const diff = item.stock - item.stock_minimo;
                    const isCritical = item.stock === 0;
                    return (
                      <tr key={item.branch_product_id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? 'bg-red-600' : 'bg-yellow-400'}`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                              {item.codigo_barras && (
                                <div className="text-xs text-gray-400">{item.codigo_barras}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {user?.rol === 'admin' && (
                          <td className="px-4 py-3 text-sm text-gray-600">{item.sucursal || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-orange-600'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {item.stock_minimo}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm ${getDiffColor(diff)}`}>
                            {diff}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Sin stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Stock bajo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              itemName="productos"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default StockAlerts;
