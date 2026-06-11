import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { formatAmount } from '../../lib/utils';
import CustomerFormModal from '../CustomerManagement/CustomerFormModal';
import {
  X, Users, UserPlus, Search, FileText, Tag, Percent,
  Plus, Trash2, ChevronDown, ChevronUp, Receipt,
  Hash, Phone,
} from 'lucide-react';

const TIPOS_COMPROBANTE = [
  { value: 'ticket',    label: 'Ticket (sin CAE)' },
  { value: 'factura_b', label: 'Factura B' },
  { value: 'factura_a', label: 'Factura A' },
  { value: 'factura_c', label: 'Factura C' },
];

const CONDICIONES_IVA = [
  { value: 'consumidor_final',     label: 'Consumidor Final' },
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista',       label: 'Monotributista' },
  { value: 'exento',               label: 'Exento' },
  { value: 'no_categorizado',      label: 'No Categorizado' },
];

const Section = ({ label, icon, open, onToggle, children, badge }) => (
  <div className="invoice-section">
    <button type="button" className="invoice-section-btn" onClick={onToggle}>
      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary, #374151)' }}>
        {icon}{label}
      </span>
      <div className="flex items-center gap-1.5">
        {badge && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
            {badge}
          </span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </div>
    </button>
    {open && <div className="invoice-section-body">{children}</div>}
  </div>
);

const InvoicePanel = ({
  open,
  currencySymbol,
  invoiceConfig,
  setInvoiceConfig,
  selectedCustomer,
  setSelectedCustomer,
  subtotal,
  tax,
  paymentAdjustment,
  discount,
  impuestosExtraTotal,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormClosing, setNewFormClosing] = useState(false);
  const [sections, setSections] = useState({
    cliente: true,
    comprobante: true,
    descuento: false,
    impuestos: false,
    obs: false,
  });
  const searchTimerRef = useRef(null);

  const toggleSection = (s) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API}/customers`, { params: { search: searchTerm, per_page: 10, page: 1 } });
        setSearchResults(res.data.items || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setSearchTerm('');
    setSearchResults([]);
  };

  const noAnim = () => document.body.classList.contains('no-animations');

  const handleNewCustomerSaved = (customer) => {
    setNewFormClosing(true);
    setTimeout(() => {
      setNewFormClosing(false);
      setShowNewForm(false);
      selectCustomer(customer);
    }, noAnim() ? 0 : 400);
  };

  const closeNewForm = () => {
    setNewFormClosing(true);
    setTimeout(() => { setNewFormClosing(false); setShowNewForm(false); }, noAnim() ? 0 : 400);
  };

  const addImpuesto = () => {
    setInvoiceConfig(prev => ({
      ...prev,
      impuestos_extra: [...(prev.impuestos_extra || []), { id: Date.now(), nombre: '', tipo: 'porcentaje', valor: 0 }],
    }));
    setSections(s => ({ ...s, impuestos: true }));
  };

  const updateImpuesto = (id, field, value) =>
    setInvoiceConfig(prev => ({
      ...prev,
      impuestos_extra: prev.impuestos_extra.map(t => t.id === id ? { ...t, [field]: value } : t),
    }));

  const removeImpuesto = (id) =>
    setInvoiceConfig(prev => ({
      ...prev,
      impuestos_extra: prev.impuestos_extra.filter(t => t.id !== id),
    }));

  const sym = currencySymbol || '$';
  const discountType = invoiceConfig.descuento_tipo || 'porcentaje';
  const discountVal = invoiceConfig.descuento_valor || 0;
  const totalFinal = subtotal + tax + paymentAdjustment - discount + impuestosExtraTotal;

  const comprobanteBadge = invoiceConfig.tipo_comprobante !== 'ticket'
    ? TIPOS_COMPROBANTE.find(t => t.value === invoiceConfig.tipo_comprobante)?.label
    : null;

  const discountBadge = discount > 0 ? `-${sym}${formatAmount(discount)}` : null;
  const impuestosBadge = impuestosExtraTotal > 0 ? `+${sym}${formatAmount(impuestosExtraTotal)}` : null;

  return (
    <>
      <div className={`invoice-panel${open ? ' open' : ''}`}>
        <div className="invoice-panel-inner">

          {/* Header */}
          <div className="invoice-panel-header">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="font-semibold text-sm">Factura</span>
            </div>
            <button type="button" onClick={onClose} className="modal-close invoice-panel-close" title="Cerrar panel">
              <X className="w-4 h-4 invoice-panel-close-x" />
              <ChevronDown className="w-5 h-5 invoice-panel-close-chevron" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="invoice-panel-body">

            {/* ─── 1. Cliente ─────────────────────────────────── */}
            <Section
              label="Cliente"
              icon={<Users className="w-3.5 h-3.5" />}
              open={sections.cliente}
              onToggle={() => toggleSection('cliente')}
              badge={selectedCustomer ? selectedCustomer.nombre.split(' ')[0] : null}
            >
              {selectedCustomer ? (
                <div
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary-light, var(--primary))' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: 'var(--primary)' }}
                  >
                    {selectedCustomer.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--primary-dark)' }}>
                      {selectedCustomer.nombre}
                    </div>
                    <div className="text-xs text-gray-500 flex gap-2 flex-wrap mt-0.5">
                      {selectedCustomer.documento && (
                        <span className="flex items-center gap-0.5">
                          <Hash className="w-3 h-3" />
                          {selectedCustomer.tipo_documento?.toUpperCase()} {selectedCustomer.documento}
                        </span>
                      )}
                      {selectedCustomer.telefono && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-3 h-3" />{selectedCustomer.telefono}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                    title="Quitar cliente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-2">Consumidor Final (por defecto)</div>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      className="form-input form-input-sm pl-8"
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searching && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <div className="spinner spinner-on-light" style={{ width: '0.875rem', height: '0.875rem' }} />
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div
                      className="border rounded-lg overflow-hidden mb-2"
                      style={{ maxHeight: '160px', overflowY: 'auto' }}
                    >
                      {searchResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                            style={{ background: 'var(--primary)' }}
                          >
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{c.nombre}</div>
                            {c.documento && (
                              <div className="text-xs text-gray-500">{c.tipo_documento?.toUpperCase()} {c.documento}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
                    <div className="text-xs text-gray-400 mb-2 text-center py-1">Sin resultados</div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowNewForm(true)}
                    className="btn btn-secondary btn-sm w-full text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Nuevo Cliente
                  </button>
                </>
              )}
            </Section>

            {/* ─── 2. Comprobante ─────────────────────────────── */}
            <Section
              label="Comprobante"
              icon={<FileText className="w-3.5 h-3.5" />}
              open={sections.comprobante}
              onToggle={() => toggleSection('comprobante')}
              badge={comprobanteBadge}
            >
              <div className="space-y-2">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Tipo de comprobante</label>
                  <select
                    className="form-select form-select-sm"
                    value={invoiceConfig.tipo_comprobante}
                    onChange={e => setInvoiceConfig(prev => ({ ...prev, tipo_comprobante: e.target.value }))}
                  >
                    {TIPOS_COMPROBANTE.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {invoiceConfig.tipo_comprobante !== 'ticket' && (
                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Condición IVA del receptor</label>
                    <select
                      className="form-select form-select-sm"
                      value={invoiceConfig.condicion_iva_receptor}
                      onChange={e => setInvoiceConfig(prev => ({ ...prev, condicion_iva_receptor: e.target.value }))}
                    >
                      {CONDICIONES_IVA.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {invoiceConfig.tipo_comprobante === 'factura_a' && (
                  <div className="form-group mb-0">
                    <label className="form-label text-xs">CUIT del receptor</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="20-12345678-9"
                      value={invoiceConfig.cuit_receptor || ''}
                      onChange={e => setInvoiceConfig(prev => ({ ...prev, cuit_receptor: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* ─── 3. Descuento ───────────────────────────────── */}
            <Section
              label="Descuento"
              icon={<Tag className="w-3.5 h-3.5" />}
              open={sections.descuento}
              onToggle={() => toggleSection('descuento')}
              badge={discountBadge}
            >
              <div className="flex gap-2 items-center mb-1.5">
                <div className="flex rounded-lg border overflow-hidden text-xs flex-shrink-0">
                  {[{ v: 'porcentaje', l: '%' }, { v: 'monto', l: sym }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      className={`px-2.5 py-1.5 font-medium transition-colors${v !== 'porcentaje' ? ' border-l' : ''}`}
                      style={discountType === v
                        ? { background: 'var(--primary)', color: '#fff' }
                        : { color: 'var(--text-secondary, #6b7280)' }
                      }
                      onClick={() => setInvoiceConfig(prev => ({ ...prev, descuento_tipo: v }))}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'porcentaje' ? 100 : undefined}
                  step="0.01"
                  className="form-input form-input-sm flex-1"
                  value={discountVal || ''}
                  onChange={e => setInvoiceConfig(prev => ({ ...prev, descuento_valor: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              {discount > 0 && (
                <div className="text-xs flex items-center gap-1 mt-1" style={{ color: '#16a34a' }}>
                  <Tag className="w-3 h-3" />
                  Descuento: -{sym}{formatAmount(discount)}
                  {discountType === 'porcentaje' && ` (${discountVal}%)`}
                </div>
              )}
            </Section>

            {/* ─── 4. Impuestos y Percepciones ────────────────── */}
            <Section
              label="Impuestos y Percepciones"
              icon={<Percent className="w-3.5 h-3.5" />}
              open={sections.impuestos}
              onToggle={() => toggleSection('impuestos')}
              badge={impuestosBadge}
            >
              <div className="space-y-2">
                {(invoiceConfig.impuestos_extra || []).map(t => (
                  <div key={t.id} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      className="form-input form-input-sm flex-1 min-w-0"
                      placeholder="Nombre (ej. IIBB)"
                      value={t.nombre}
                      onChange={e => updateImpuesto(t.id, 'nombre', e.target.value)}
                    />
                    <select
                      className="form-select form-select-sm flex-shrink-0"
                      style={{ width: '3.5rem', paddingLeft: '0.375rem', paddingRight: '1.25rem' }}
                      value={t.tipo}
                      onChange={e => updateImpuesto(t.id, 'tipo', e.target.value)}
                    >
                      <option value="porcentaje">%</option>
                      <option value="monto">{sym}</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input form-input-sm flex-shrink-0"
                      style={{ width: '4rem' }}
                      value={t.valor || ''}
                      onChange={e => updateImpuesto(t.id, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => removeImpuesto(t.id)}
                      className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImpuesto}
                  className="btn btn-secondary btn-sm w-full text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar impuesto / percepción
                </button>
              </div>
            </Section>

            {/* ─── 5. Observaciones ───────────────────────────── */}
            <Section
              label="Observaciones"
              icon={<FileText className="w-3.5 h-3.5" />}
              open={sections.obs}
              onToggle={() => toggleSection('obs')}
            >
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Observaciones para el comprobante"
                value={invoiceConfig.observaciones || ''}
                onChange={e => setInvoiceConfig(prev => ({ ...prev, observaciones: e.target.value }))}
              />
            </Section>

          </div>

          {/* Footer — resumen de totales */}
          <div className="invoice-panel-footer">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{sym}{formatAmount(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>IVA / Impuestos config.</span>
                  <span>{sym}{formatAmount(tax)}</span>
                </div>
              )}
              {paymentAdjustment !== 0 && (
                <div
                  className="flex justify-between text-xs"
                  style={{ color: paymentAdjustment < 0 ? '#16a34a' : '#dc2626' }}
                >
                  <span>{paymentAdjustment < 0 ? 'Desc. método pago' : 'Recargo método pago'}</span>
                  <span>
                    {paymentAdjustment < 0 ? '-' : '+'}{sym}{formatAmount(Math.abs(paymentAdjustment))}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs" style={{ color: '#16a34a' }}>
                  <span>Descuento manual</span>
                  <span>-{sym}{formatAmount(discount)}</span>
                </div>
              )}
              {impuestosExtraTotal > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--primary)' }}>
                  <span>Imp. / Percepciones</span>
                  <span>+{sym}{formatAmount(impuestosExtraTotal)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-sm pt-1.5 border-t mt-1"
                style={{ color: 'var(--primary)', borderColor: 'var(--border-color)' }}
              >
                <span>Total</span>
                <span>{sym}{formatAmount(totalFinal)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Formulario nuevo cliente — modal nivel 2 */}
      {showNewForm && (
        <CustomerFormModal
          posMode
          closing={newFormClosing}
          onClose={closeNewForm}
          onSaved={handleNewCustomerSaved}
        />
      )}
    </>
  );
};

export default InvoicePanel;
