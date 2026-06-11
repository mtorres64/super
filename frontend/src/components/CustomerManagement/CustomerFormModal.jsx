import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import {
  X, Save, ArrowLeft, UserPlus,
  Phone, Mail, MapPin, Calendar, FileText, CircleDot,
  Search, Loader2, AlertTriangle,
} from 'lucide-react';

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const emptyForm = {
  nombre: '',
  tipo_documento: 'dni',
  documento: '',
  telefono: '',
  email: '',
  direccion: '',
  fecha_nacimiento: '',
  observaciones: '',
  activo: true,
};

const CustomerFormModal = ({
  editingCustomer = null,
  onClose,
  closing,
  onSaved,
  posMode = false,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [afipSearching, setAfipSearching] = useState(false);
  const [docDuplicado, setDocDuplicado] = useState(null);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        nombre: editingCustomer.nombre || '',
        tipo_documento: editingCustomer.tipo_documento || 'dni',
        documento: editingCustomer.documento || '',
        telefono: editingCustomer.telefono || '',
        email: editingCustomer.email || '',
        direccion: editingCustomer.direccion || '',
        fecha_nacimiento: editingCustomer.fecha_nacimiento || '',
        observaciones: editingCustomer.observaciones || '',
        activo: editingCustomer.activo !== undefined ? editingCustomer.activo : true,
      });
    } else {
      setFormData(emptyForm);
    }
    setDocDuplicado(null);
  }, [editingCustomer]);

  const verificarDocumento = async (tipo, doc) => {
    const clean = doc.replace(/\D/g, '');
    const minLen = (tipo === 'cuit' || tipo === 'cuil') ? 11 : 7;
    if (clean.length < minLen) { setDocDuplicado(null); return; }
    try {
      const res = await axios.get(`${API}/customers/check-documento`, {
        params: {
          tipo_documento: tipo,
          documento: doc,
          ...(editingCustomer ? { exclude_id: editingCustomer.id } : {}),
        },
      });
      setDocDuplicado(res.data.existe ? res.data : null);
    } catch {
      setDocDuplicado(null);
    }
  };

  const buscarCuitAfip = async (cuit) => {
    setAfipSearching(true);
    try {
      const res = await axios.get(`${API}/afip/consultar-cuit/${cuit}`);
      const data = res.data;
      setFormData(prev => ({
        ...prev,
        ...(data.nombre ? { nombre: data.nombre } : {}),
        ...(data.direccion ? { direccion: data.direccion } : {}),
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        toast('Este CUIT no figura en el padrón de AFIP. Podés completar los datos manualmente.', { icon: 'ℹ️' });
      } else if (error.response?.status === 403) {
        toast('El certificado AFIP no tiene permiso para consultar el padrón. Autorizá el servicio WS_SR_PADRON_A4 en el portal de AFIP.', { icon: '⚠️', duration: 8000 });
      } else if (error.response?.status === 503) {
        toast('El servicio de consulta AFIP no está disponible. Completá los datos manualmente.', { icon: 'ℹ️' });
      } else {
        toast.error('No se pudo consultar el padrón de AFIP. Intentá de nuevo más tarde.');
      }
    } finally {
      setAfipSearching(false);
    }
  };

  const handleDocChange = (val) => {
    const clean = val.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, documento: val }));
    const isCuitCuil = formData.tipo_documento === 'cuit' || formData.tipo_documento === 'cuil';
    if (isCuitCuil && clean.length === 11) {
      verificarDocumento(formData.tipo_documento, val);
      if (formData.tipo_documento === 'cuit') buscarCuitAfip(clean);
    } else if (formData.tipo_documento === 'dni' && (clean.length === 8 || clean.length === 7)) {
      verificarDocumento(formData.tipo_documento, val);
    } else if (clean.length < (isCuitCuil ? 11 : 7)) {
      setDocDuplicado(null);
    }
  };

  const handleDocBlur = (val) => {
    const clean = val.replace(/\D/g, '');
    verificarDocumento(formData.tipo_documento, val);
    if (formData.tipo_documento === 'cuit' && clean.length === 11) buscarCuitAfip(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (posMode && docDuplicado) {
      toast.error(`Ya existe "${docDuplicado.nombre}" con ese documento. Seleccioná el cliente existente.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        documento: formData.documento || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        direccion: formData.direccion || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        observaciones: formData.observaciones || null,
      };
      let savedCustomer;
      if (editingCustomer) {
        const res = await axios.put(`${API}/customers/${editingCustomer.id}`, payload);
        savedCustomer = res.data;
        toast.success('Cliente actualizado exitosamente');
      } else {
        const res = await axios.post(`${API}/customers`, payload);
        savedCustomer = res.data;
        toast.success(posMode ? 'Cliente creado' : 'Cliente creado exitosamente');
      }
      onSaved(savedCustomer);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Error al guardar el cliente';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isCuit = formData.tipo_documento === 'cuit';

  return (
    <div
      className={`ticket-modal-overlay${closing ? ' closing' : ''}`}
      style={posMode ? { zIndex: 1100 } : undefined}
      onClick={posMode ? onClose : undefined}
    >
      <div
        className={`ticket-modal-container${closing ? ' closing' : ''}`}
        style={{ maxWidth: '680px', width: '95vw', ...(posMode ? { zIndex: 1101 } : {}) }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title flex items-center gap-2">
            {posMode && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors mr-1"
                title="Volver"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <UserPlus className="w-5 h-5" />
            {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Tipo doc + Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Tipo de documento</label>
                <select
                  className="form-select"
                  style={isCuit ? { backgroundColor: '#fefce8', borderColor: '#ca8a04' } : {}}
                  value={formData.tipo_documento}
                  onChange={e => {
                    const newTipo = e.target.value;
                    setFormData(prev => ({ ...prev, tipo_documento: newTipo }));
                    if (formData.documento) verificarDocumento(newTipo, formData.documento);
                  }}
                >
                  <option value="dni">DNI</option>
                  <option value="cuit">CUIT</option>
                  <option value="cuil">CUIL</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  {isCuit ? 'CUIT' : formData.tipo_documento === 'cuil' ? 'CUIL' : formData.tipo_documento === 'pasaporte' ? 'Pasaporte' : formData.tipo_documento === 'otro' ? 'Número' : 'DNI'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="form-input"
                    style={isCuit ? { backgroundColor: '#fefce8', borderColor: '#ca8a04', paddingRight: '2.25rem' } : {}}
                    value={formData.documento}
                    onChange={e => handleDocChange(e.target.value)}
                    onBlur={e => handleDocBlur(e.target.value)}
                    placeholder="Opcional"
                  />
                  {isCuit && (
                    <button
                      type="button"
                      onClick={() => {
                        const clean = formData.documento.replace(/\D/g, '');
                        if (clean.length >= 10) buscarCuitAfip(clean.slice(0, 11));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-600 hover:text-yellow-800 disabled:opacity-40"
                      title="Buscar en padrón AFIP"
                      disabled={afipSearching}
                    >
                      {afipSearching
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Search className="w-4 h-4" />
                      }
                    </button>
                  )}
                </div>

                {/* Aviso de duplicado — posMode: panel amber con botón Seleccionar */}
                {docDuplicado && posMode && (
                  <div className="mt-1 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 text-amber-800">
                      Ya existe <strong>{docDuplicado.nombre}</strong> con este documento.
                    </div>
                    <button
                      type="button"
                      onClick={() => onSaved(docDuplicado)}
                      className="btn btn-sm bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 shrink-0"
                    >
                      Seleccionar
                    </button>
                  </div>
                )}
                {/* Aviso de duplicado — modo gestión: aviso pequeño amber */}
                {docDuplicado && !posMode && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Ya existe <strong className="ml-0.5">{docDuplicado.nombre}</strong> con este documento
                  </div>
                )}
              </div>
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre y Apellido / Razón Social *</label>
              <input
                type="text"
                className="form-input"
                value={formData.nombre}
                onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>

            {/* Teléfono + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Teléfono</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.telefono}
                  onChange={e => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="form-group">
              <label className="form-label flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Dirección</label>
              <input
                type="text"
                className="form-input"
                value={formData.direccion}
                onChange={e => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Opcional"
              />
            </div>

            {/* Fecha nacimiento + Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Fecha de nacimiento</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.fecha_nacimiento}
                  onChange={e => setFormData(prev => ({ ...prev, fecha_nacimiento: formatDateInput(e.target.value) }))}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><CircleDot className="w-3.5 h-3.5" />Estado</label>
                <select
                  className="form-select"
                  value={formData.activo ? 'true' : 'false'}
                  onChange={e => setFormData(prev => ({ ...prev, activo: e.target.value === 'true' }))}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Observaciones */}
            <div className="form-group">
              <label className="form-label flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Observaciones</label>
              <input
                type="text"
                className="form-input"
                value={formData.observaciones}
                onChange={e => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Notas adicionales... (opcional)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
              {posMode ? 'Volver' : 'Cancelar'}
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              ) : editingCustomer ? (
                <><Save className="w-4 h-4" />Actualizar Cliente</>
              ) : posMode ? (
                <><Save className="w-4 h-4" />Crear y Seleccionar</>
              ) : (
                <><Save className="w-4 h-4" />Crear Cliente</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
