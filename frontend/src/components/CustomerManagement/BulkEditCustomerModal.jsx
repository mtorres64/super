import React from 'react';
import { X, Save, Users } from 'lucide-react';

const BulkEditCustomerModal = ({ items, onItemChange, closing, onClose, onSave, saving }) => {
  return (
    <div className={`modal-overlay${closing ? ' closing' : ''}`}>
      <div
        className={`modal-content modal-content-bounce${closing ? ' closing' : ''}`}
        style={{ maxWidth: '860px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Editar {items.length} cliente{items.length !== 1 ? 's' : ''}
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-3 pb-1">
            {items.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-sm text-gray-700 truncate">{item._nombre_original}</span>
                </div>

                <div className="space-y-2">
                  {/* Nombre + Estado */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group mb-0">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.nombre}
                        onChange={e => onItemChange(item.id, 'nombre', e.target.value)}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Estado</label>
                      <select
                        className="form-select"
                        value={item.activo ? 'true' : 'false'}
                        onChange={e => onItemChange(item.id, 'activo', e.target.value === 'true')}
                      >
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                      </select>
                    </div>
                  </div>

                  {/* Tipo doc + Documento */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group mb-0">
                      <label className="form-label">Tipo doc.</label>
                      <select
                        className="form-select"
                        value={item.tipo_documento || 'dni'}
                        onChange={e => onItemChange(item.id, 'tipo_documento', e.target.value)}
                      >
                        <option value="dni">DNI</option>
                        <option value="cuit">CUIT</option>
                        <option value="cuil">CUIL</option>
                        <option value="pasaporte">Pasaporte</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Documento</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.documento}
                        onChange={e => onItemChange(item.id, 'documento', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  {/* Teléfono + Email */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group mb-0">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={item.telefono}
                        onChange={e => onItemChange(item.id, 'telefono', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={item.email}
                        onChange={e => onItemChange(item.id, 'email', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="form-group mb-0">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.direccion}
                      onChange={e => onItemChange(item.id, 'direccion', e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>

                  {/* Observaciones */}
                  <div className="form-group mb-0">
                    <label className="form-label">Observaciones</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.observaciones}
                      onChange={e => onItemChange(item.id, 'observaciones', e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving ? (
              <><div className="spinner w-4 h-4" />Guardando...</>
            ) : (
              <><Save className="w-4 h-4" />Guardar {items.length} cliente{items.length !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditCustomerModal;
