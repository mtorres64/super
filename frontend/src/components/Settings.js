import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import LogoUploader from './LogoUploader';
import { 
  Settings as SettingsIcon, 
  Save, 
  Building2, 
  Calculator, 
  ShoppingCart, 
  Archive,
  Globe,
  Receipt,
  Volume2,
  VolumeX,
  Grid3X3
} from 'lucide-react';

const Settings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/config`, config);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpdate = (logoUrl) => {
    setConfig(prev => ({
      ...prev,
      company_logo: logoUrl
    }));
  };

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'financial', label: 'Finanzas', icon: Calculator },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventario', icon: Archive },
    { id: 'interface', label: 'Interfaz', icon: Grid3X3 },
    { id: 'system', label: 'Sistema', icon: Globe },
    { id: 'receipt', label: 'Recibos', icon: Receipt }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <SettingsIcon className="w-8 h-8 inline mr-3" />
            Configuración del Sistema
          </h1>
          <p className="text-gray-600">
            Personaliza la configuración de tu supermercado
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <>
              <div className="spinner" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Company Information */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información de la Empresa
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config?.company_name || ''}
                    onChange={(e) => updateConfig('company_name', e.target.value)}
                    placeholder="Mi Supermercado"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">RUC/NIT</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config?.company_tax_id || ''}
                    onChange={(e) => updateConfig('company_tax_id', e.target.value)}
                    placeholder="1234567890001"
                  />
                </div>

                <div className="form-group md:col-span-2">
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config?.company_address || ''}
                    onChange={(e) => updateConfig('company_address', e.target.value)}
                    placeholder="Calle Principal 123, Ciudad"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={config?.company_phone || ''}
                    onChange={(e) => updateConfig('company_phone', e.target.value)}
                    placeholder="+593 99 123 4567"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={config?.company_email || ''}
                    onChange={(e) => updateConfig('company_email', e.target.value)}
                    placeholder="contacto@misupermercado.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Financial Settings */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración Financiera
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label">Impuesto (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-input pr-8"
                      value={config?.tax_rate ? (config.tax_rate * 100).toFixed(2) : ''}
                      onChange={(e) => updateConfig('tax_rate', parseFloat(e.target.value) / 100)}
                      placeholder="12.00"
                    />
                    <span className="absolute right-3 top-3 text-gray-500">%</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Impuesto aplicado a todas las ventas
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Símbolo de Moneda</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config?.currency_symbol || ''}
                    onChange={(e) => updateConfig('currency_symbol', e.target.value)}
                    placeholder="$"
                    maxLength="3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Código de Moneda</label>
                  <select
                    className="form-select"
                    value={config?.currency_code || ''}
                    onChange={(e) => updateConfig('currency_code', e.target.value)}
                  >
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="PEN">PEN - Sol Peruano</option>
                    <option value="ARS">ARS - Peso Argentino</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Vista previa de precio</h4>
                <div className="text-lg">
                  Producto: <span className="font-semibold">{config?.currency_symbol}10.00</span>
                  <br />
                  Impuesto ({(config?.tax_rate * 100 || 12).toFixed(2)}%): <span className="font-semibold">{config?.currency_symbol}{((10 * (config?.tax_rate || 0.12)) || 1.20).toFixed(2)}</span>
                  <br />
                  Total: <span className="font-semibold text-green-600">{config?.currency_symbol}{(10 * (1 + (config?.tax_rate || 0.12))).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* POS Settings */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración del Punto de Venta
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {config?.sounds_enabled ? (
                      <Volume2 className="w-5 h-5 text-green-600 mr-3" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400 mr-3" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">Sonidos del Sistema</h4>
                      <p className="text-sm text-gray-500">Activar sonidos de confirmación y error</p>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={config?.sounds_enabled || false}
                      onChange={(e) => updateConfig('sounds_enabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Auto-focus en Código de Barras</h4>
                    <p className="text-sm text-gray-500">Mantener el foco en el campo de código de barras</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={config?.auto_focus_barcode || false}
                      onChange={(e) => updateConfig('auto_focus_barcode', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Tiempo de espera para escáner automático (ms)</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="10"
                    className="form-input"
                    value={config?.barcode_scan_timeout || 100}
                    onChange={(e) => updateConfig('barcode_scan_timeout', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Tiempo entre caracteres para detectar escáner automático
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Settings */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración de Inventario
              </h3>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Stock Mínimo por Defecto</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={config?.default_minimum_stock || 10}
                    onChange={(e) => updateConfig('default_minimum_stock', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Stock mínimo asignado automáticamente a nuevos productos
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Alertas de Stock Bajo</h4>
                    <p className="text-sm text-gray-500">Mostrar notificaciones cuando el stock esté bajo</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={config?.low_stock_alert_enabled || false}
                      onChange={(e) => updateConfig('low_stock_alert_enabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Actualización Automática de Inventario</h4>
                    <p className="text-sm text-gray-500">Descontar automáticamente del stock al realizar ventas</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={config?.auto_update_inventory || false}
                      onChange={(e) => updateConfig('auto_update_inventory', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Interface Settings */}
          {activeTab === 'interface' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración de Interfaz
              </h3>
              
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <LogoUploader
                    currentLogo={config?.company_logo}
                    onLogoUpdate={handleLogoUpdate}
                  />
                </div>

                {/* Pagination Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Configuración de Paginación</h4>
                  
                  <div className="form-group">
                    <label className="form-label">Elementos por página</label>
                    <select
                      className="form-select"
                      value={config?.items_per_page || 10}
                      onChange={(e) => updateConfig('items_per_page', parseInt(e.target.value))}
                    >
                      <option value="5">5 elementos</option>
                      <option value="10">10 elementos</option>
                      <option value="15">15 elementos</option>
                      <option value="20">20 elementos</option>
                      <option value="25">25 elementos</option>
                      <option value="50">50 elementos</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Número máximo de elementos mostrados en las tablas
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h5 className="font-medium text-blue-900 text-sm mb-2">Afecta a:</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Lista de productos en gestión de inventario</li>
                      <li>• Histórico de ventas en reportes</li>
                      <li>• Lista de usuarios</li>
                      <li>• Productos en el punto de venta</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración del Sistema
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="form-label">Formato de Fecha</label>
                  <select
                    className="form-select"
                    value={config?.date_format || ''}
                    onChange={(e) => updateConfig('date_format', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-25)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Formato de Hora</label>
                  <select
                    className="form-select"
                    value={config?.time_format || ''}
                    onChange={(e) => updateConfig('time_format', e.target.value)}
                  >
                    <option value="24h">24 Horas (14:30)</option>
                    <option value="12h">12 Horas (2:30 PM)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Idioma</label>
                  <select
                    className="form-select"
                    value={config?.language || ''}
                    onChange={(e) => updateConfig('language', e.target.value)}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Settings */}
          {activeTab === 'receipt' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración de Recibos
              </h3>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Texto del pie de recibo</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={config?.receipt_footer_text || ''}
                    onChange={(e) => updateConfig('receipt_footer_text', e.target.value)}
                    placeholder="¡Gracias por su compra! Vuelva pronto."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ancho del recibo (caracteres)</label>
                  <input
                    type="number"
                    min="40"
                    max="120"
                    className="form-input"
                    value={config?.receipt_width || 80}
                    onChange={(e) => updateConfig('receipt_width', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Ancho en caracteres para impresoras térmicas
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Imprimir Recibo Automáticamente</h4>
                    <p className="text-sm text-gray-500">Enviar automáticamente a impresión después de cada venta</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={config?.print_receipt_auto || false}
                      onChange={(e) => updateConfig('print_receipt_auto', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Vista previa del recibo</h4>
                <div className="bg-white p-4 rounded border font-mono text-sm">
                  <div className="text-center mb-2">
                    <div className="font-bold">{config?.company_name || 'SUPERMERCADO'}</div>
                    {config?.company_address && <div>{config.company_address}</div>}
                    {config?.company_phone && <div>Tel: {config.company_phone}</div>}
                    {config?.company_tax_id && <div>RUC: {config.company_tax_id}</div>}
                  </div>
                  <div className="border-t border-dashed my-2"></div>
                  <div>FACTURA: FAC-000123</div>
                  <div>FECHA: 25/12/2024 14:30</div>
                  <div>CAJERO: Admin SuperMarket</div>
                  <div className="border-t border-dashed my-2"></div>
                  <div>Leche Entera 1L    x1    {config?.currency_symbol}1.25</div>
                  <div>Pan Integral       x2    {config?.currency_symbol}1.50</div>
                  <div className="border-t border-dashed my-2"></div>
                  <div>SUBTOTAL:                {config?.currency_symbol}2.75</div>
                  <div>IMPUESTO ({(config?.tax_rate * 100 || 12).toFixed(1)}%):          {config?.currency_symbol}{(2.75 * (config?.tax_rate || 0.12)).toFixed(2)}</div>
                  <div className="font-bold">TOTAL:                   {config?.currency_symbol}{(2.75 * (1 + (config?.tax_rate || 0.12))).toFixed(2)}</div>
                  <div className="border-t border-dashed my-2"></div>
                  <div className="text-center">
                    {config?.receipt_footer_text || '¡Gracias por su compra!'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for switch */}
      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #10b981;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #10b981;
        }

        input:checked + .slider:before {
          transform: translateX(24px);
        }
      `}</style>
    </div>
  );
};

export default Settings;