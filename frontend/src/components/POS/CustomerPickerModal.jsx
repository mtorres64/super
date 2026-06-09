import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import {
  Search, X, Users, UserPlus, Phone, Mail, Hash,
  ArrowLeft, Save, CircleDot, Calendar, MapPin, FileText,
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

/* ─── Level 1: Customer search/pick ────────────────────────────── */
const CustomerPickerModal = ({ onSelect, onClose, closing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormClosing, setNewFormClosing] = useState(false);
  const searchTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchTerm.length === 0) {
      setResults([]);
      return;
    }
    if (searchTerm.length >= 2) {
      searchTimerRef.current = setTimeout(() => doSearch(searchTerm), 300);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  const doSearch = async (q) => {
    setSearching(true);
    try {
      const res = await axios.get(`${API}/customers`, { params: { search: q, per_page: 20, page: 1 } });
      setResults(res.data.items || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openNewForm = () => setShowNewForm(true);

  const closeNewForm = () => {
    setNewFormClosing(true);
    const delay = document.body.classList.contains('no-animations') ? 0 : 400;
    setTimeout(() => { setNewFormClosing(false); setShowNewForm(false); }, delay);
  };

  const handleNewCustomerSaved = (customer) => {
    setNewFormClosing(true);
    const delay = document.body.classList.contains('no-animations') ? 0 : 400;
    setTimeout(() => {
      setNewFormClosing(false);
      setShowNewForm(false);
      onSelect(customer);
    }, delay);
  };

  return (
    <>
      {/* Level 1 overlay */}
      <div className={`ticket-modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
        <div
          className={`ticket-modal-container${closing ? ' closing' : ''}`}
          style={{ maxWidth: '480px', width: '95vw' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <h3 className="modal-title flex items-center gap-2">
              <Users className="w-5 h-5" />
              Seleccionar Cliente
            </h3>
            <button onClick={onClose} className="modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              className="form-input pl-10"
              placeholder="Buscar por nombre, documento, email, teléfono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchTerm.length >= 2) doSearch(searchTerm); }}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="spinner spinner-on-light w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Results */}
          <div className="overflow-y-auto" style={{ maxHeight: '320px', minHeight: '80px' }}>
            {results.length === 0 && searchTerm.length >= 2 && !searching && (
              <div className="text-center py-6 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No se encontraron clientes</p>
              </div>
            )}
            {results.length === 0 && searchTerm.length < 2 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                Escribí al menos 2 caracteres para buscar
              </div>
            )}
            {results.map(customer => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors mb-1 flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'var(--primary)' }}
                >
                  {customer.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{customer.nombre}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {customer.documento && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {customer.tipo_documento?.toUpperCase()} {customer.documento}
                      </span>
                    )}
                    {customer.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{customer.telefono}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />{customer.email}
                      </span>
                    )}
                  </div>
                </div>
                {!customer.activo && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full shrink-0">Inactivo</span>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button onClick={openNewForm} className="btn btn-primary btn-sm">
              <UserPlus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Level 2: New customer form */}
      {showNewForm && (
        <NewCustomerForm
          closing={newFormClosing}
          onClose={closeNewForm}
          onSaved={handleNewCustomerSaved}
        />
      )}
    </>
  );
};

/* ─── Level 2: New customer form ───────────────────────────────── */
export const NewCustomerForm = ({ closing, onClose, onSaved }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const res = await axios.post(`${API}/customers`, payload);
      toast.success('Cliente creado');
      onSaved(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Error al crear el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`ticket-modal-overlay${closing ? ' closing' : ''}`}
      style={{ zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        className={`ticket-modal-container${closing ? ' closing' : ''}`}
        style={{ maxWidth: '520px', width: '95vw', zIndex: 1101 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors mr-1"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <UserPlus className="w-5 h-5" />
            Nuevo Cliente
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="form-group">
              <label className="form-label">Nombre y Apellido / Razón Social *</label>
              <input
                type="text"
                className="form-input"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Tipo de documento</label>
                <select
                  className="form-select"
                  value={formData.tipo_documento}
                  onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                >
                  <option value="dni">DNI</option>
                  <option value="cuit">CUIT</option>
                  <option value="cuil">CUIL</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Número</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.documento}
                  onChange={e => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Teléfono</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Dirección</label>
              <input
                type="text"
                className="form-input"
                value={formData.direccion}
                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Nacimiento</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.fecha_nacimiento}
                  onChange={e => setFormData({ ...formData, fecha_nacimiento: formatDateInput(e.target.value) })}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><CircleDot className="w-3.5 h-3.5" />Estado</label>
                <select
                  className="form-select"
                  value={formData.activo ? 'true' : 'false'}
                  onChange={e => setFormData({ ...formData, activo: e.target.value === 'true' })}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Observaciones</label>
              <input
                type="text"
                className="form-input"
                value={formData.observaciones}
                onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
              Volver
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <><div className="spinner w-4 h-4" />Guardando...</>
              ) : (
                <><Save className="w-4 h-4" />Crear y Seleccionar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerPickerModal;
