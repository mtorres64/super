import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import Label from './Label';
import { LABEL_SIZES } from './labelSizes';

const LabelPrintModal = ({ productos, onClose }) => {
  const [sizeId, setSizeId] = useState('mediano');
  const [mostrarPrecio, setMostrarPrecio] = useState(true);
  const [mostrarCodigoBarras, setMostrarCodigoBarras] = useState(true);

  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content-bounce"
        style={{ maxWidth: '900px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Imprimir etiqueta{productos.length !== 1 ? 's' : ''} ({productos.length})
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 pb-1">
            {/* Opciones */}
            <div className="space-y-4">
              <div className="form-group mb-0">
                <label className="form-label">Tamaño</label>
                <select className="form-select" value={sizeId} onChange={e => setSizeId(e.target.value)}>
                  {LABEL_SIZES.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={mostrarPrecio}
                  onChange={e => setMostrarPrecio(e.target.checked)}
                />
                Mostrar precio
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={mostrarCodigoBarras}
                  onChange={e => setMostrarCodigoBarras(e.target.checked)}
                />
                Mostrar código de barras
              </label>
              <button onClick={handlePrint} className="btn btn-primary w-full">
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>

            {/* Vista previa / área de impresión */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
              <div id="label-print-area" className="product-label-sheet">
                {productos.map(p => (
                  <Label
                    key={p.id}
                    producto={p}
                    sizeId={sizeId}
                    mostrarPrecio={mostrarPrecio}
                    mostrarCodigoBarras={mostrarCodigoBarras}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPrintModal;
