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
  Grid3X3,
  Palette,
  Check,
  Upload,
  Wifi,
  WifiOff
} from 'lucide-react';

/* ─── Color theme presets ─── */
const COLOR_THEMES = [
  { id: 'emerald',  name: 'Verde Esmeralda', primary: '#10b981', dark: '#059669', darker: '#047857', light: 'rgba(16,185,129,0.1)',  bg: '#ecfdf5' },
  { id: 'blue',     name: 'Azul Océano',     primary: '#3b82f6', dark: '#2563eb', darker: '#1d4ed8', light: 'rgba(59,130,246,0.1)',  bg: '#eff6ff' },
  { id: 'violet',   name: 'Violeta',          primary: '#8b5cf6', dark: '#7c3aed', darker: '#6d28d9', light: 'rgba(139,92,246,0.1)', bg: '#f5f3ff' },
  { id: 'rose',     name: 'Rosa',             primary: '#f43f5e', dark: '#e11d48', darker: '#be123c', light: 'rgba(244,63,94,0.1)',  bg: '#fff1f2' },
  { id: 'orange',   name: 'Naranja',          primary: '#f97316', dark: '#ea580c', darker: '#c2410c', light: 'rgba(249,115,22,0.1)', bg: '#fff7ed' },
  { id: 'indigo',   name: 'Índigo',           primary: '#6366f1', dark: '#4f46e5', darker: '#4338ca', light: 'rgba(99,102,241,0.1)', bg: '#eef2ff' },
  { id: 'cyan',     name: 'Cian',             primary: '#06b6d4', dark: '#0891b2', darker: '#0e7490', light: 'rgba(6,182,212,0.1)',  bg: '#ecfeff' },
  { id: 'amber',    name: 'Ámbar',            primary: '#f59e0b', dark: '#d97706', darker: '#b45309', light: 'rgba(245,158,11,0.1)', bg: '#fffbeb' },
];

/* ─── Color helpers ─── */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

const darkenHex = (hex, amount) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v) => Math.max(0, Math.min(255, v));
  return `#${[clamp(rgb.r - amount), clamp(rgb.g - amount), clamp(rgb.b - amount)]
    .map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

const hexToRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'white';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155 ? '#1f2937' : 'white';
};

// Applies CSS variables only — does NOT persist to localStorage.
// Call persistTheme() after a successful DB save to also update localStorage.
const applyTheme = (theme) => {
  const root = document.documentElement;
  root.style.setProperty('--primary',        theme.primary);
  root.style.setProperty('--primary-dark',   theme.dark);
  root.style.setProperty('--primary-darker', theme.darker);
  root.style.setProperty('--primary-light',  theme.light);
  root.style.setProperty('--primary-bg',     theme.bg);
  root.style.setProperty('--primary-text',   getContrastColor(theme.primary));
  if (theme.secondary) {
    root.style.setProperty('--secondary',       theme.secondary);
    root.style.setProperty('--secondary-dark',  darkenHex(theme.secondary, 20));
    root.style.setProperty('--secondary-light', hexToRgba(theme.secondary, 0.1));
    root.style.setProperty('--secondary-bg',    hexToRgba(theme.secondary, 0.05));
    root.style.setProperty('--secondary-text',  getContrastColor(theme.secondary));
  }
  if (theme.tertiary) {
    root.style.setProperty('--tertiary',       theme.tertiary);
    root.style.setProperty('--tertiary-dark',  darkenHex(theme.tertiary, 20));
    root.style.setProperty('--tertiary-light', hexToRgba(theme.tertiary, 0.1));
    root.style.setProperty('--tertiary-bg',    hexToRgba(theme.tertiary, 0.05));
    root.style.setProperty('--tertiary-text',  getContrastColor(theme.tertiary));
  }
};

// Persists theme to localStorage (call only after successful DB save).
const persistTheme = (theme) => {
  localStorage.setItem('app_theme', JSON.stringify(theme));
};

const DEFAULT_COLORS = {
  primary_color:   '#10b981',
  secondary_color: '#e0f6ff',
  tertiary_color:  '#ede0ff',
};

const buildCustomTheme = (color) => ({
  primary:  color,
  dark:     darkenHex(color, 25),
  darker:   darkenHex(color, 45),
  light:    hexToRgba(color, 0.1),
  bg:       hexToRgba(color, 0.05),
});

const Settings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [taxInput, setTaxInput] = useState('');

  // Estado AFIP
  const [afipConfig, setAfipConfig] = useState({ cuit: '', punto_venta: 1, ambiente: 'homologacion', tipo_comprobante_default: 6, razon_social: '' });
  const [afipStatus, setAfipStatus] = useState(null); // { configurado, tiene_certificado, tiene_clave, ... }
  const [afipSaving, setAfipSaving] = useState(false);
  const [afipTesting, setAfipTesting] = useState(false);
  const [afipTestResult, setAfipTestResult] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [p12File, setP12File] = useState(null);
  const [p12Password, setP12Password] = useState('');

  useEffect(() => {
    fetchConfiguration();
    fetchAfipConfig();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      const data = response.data;
      setConfig(data);
      setTaxInput(data?.tax_rate != null ? String(data.tax_rate * 100) : '');
      // DB is the source of truth — apply whatever is saved there
      if (data?.primary_color) {
        const preset = COLOR_THEMES.find(t => t.primary === data.primary_color);
        const baseTheme = preset || buildCustomTheme(data.primary_color);
        applyTheme({ ...baseTheme, secondary: data.secondary_color, tertiary: data.tertiary_color });
      }
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
      // Only persist to localStorage after a successful DB save
      if (config?.primary_color) {
        const preset = COLOR_THEMES.find(t => t.primary === config.primary_color);
        const baseTheme = preset || buildCustomTheme(config.primary_color);
        persistTheme({ ...baseTheme, secondary: config.secondary_color, tertiary: config.tertiary_color });
      }
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    const newConfig = { ...config, ...DEFAULT_COLORS };
    setConfig(newConfig);
    const preset = COLOR_THEMES.find(t => t.primary === DEFAULT_COLORS.primary_color);
    const baseTheme = preset || buildCustomTheme(DEFAULT_COLORS.primary_color);
    applyTheme({ ...baseTheme, secondary: DEFAULT_COLORS.secondary_color, tertiary: DEFAULT_COLORS.tertiary_color });
    try {
      await axios.put(`${API}/config`, newConfig);
      persistTheme({ ...baseTheme, secondary: DEFAULT_COLORS.secondary_color, tertiary: DEFAULT_COLORS.tertiary_color });
      toast.success('Colores restaurados a valores predeterminados');
    } catch {
      toast.error('Error al guardar configuración');
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpdate = (logoUrl) => {
    setConfig(prev => ({ ...prev, company_logo: logoUrl }));
  };

  const handleThemeSelect = (theme) => {
    updateConfig('primary_color', theme.primary);
    applyTheme({ ...theme, secondary: config?.secondary_color, tertiary: config?.tertiary_color });
  };

  const handleCustomColor = (color) => {
    updateConfig('primary_color', color);
    applyTheme({ ...buildCustomTheme(color), secondary: config?.secondary_color, tertiary: config?.tertiary_color });
  };

  const handleCustomSecondary = (color) => {
    updateConfig('secondary_color', color);
    const preset = COLOR_THEMES.find(t => t.primary === config?.primary_color);
    const baseTheme = preset || buildCustomTheme(config?.primary_color || '#10b981');
    applyTheme({ ...baseTheme, secondary: color, tertiary: config?.tertiary_color });
  };

  const handleCustomTertiary = (color) => {
    updateConfig('tertiary_color', color);
    const preset = COLOR_THEMES.find(t => t.primary === config?.primary_color);
    const baseTheme = preset || buildCustomTheme(config?.primary_color || '#10b981');
    applyTheme({ ...baseTheme, secondary: config?.secondary_color, tertiary: color });
  };

  const activeTheme = (() => {
    const color = config?.primary_color;
    const preset = COLOR_THEMES.find(t => t.primary === color);
    return preset || buildCustomTheme(color || '#10b981');
  })();

  // ── Funciones AFIP ──────────────────────────────────────────────────────────

  const fetchAfipConfig = async () => {
    try {
      const res = await axios.get(`${API}/afip/config`);
      setAfipStatus(res.data);
      if (res.data.configurado) {
        setAfipConfig({
          cuit: res.data.cuit || '',
          punto_venta: res.data.punto_venta || 1,
          ambiente: res.data.ambiente || 'homologacion',
          tipo_comprobante_default: res.data.tipo_comprobante_default || 6,
          razon_social: res.data.razon_social || '',
        });
      }
    } catch {
      // No hay config AFIP todavía — es normal
    }
  };

  const handleSaveAfip = async () => {
    if (!afipConfig.cuit.trim()) { toast.error('Ingresá el CUIT del comercio'); return; }
    setAfipSaving(true);
    try {
      await axios.post(`${API}/afip/config`, afipConfig);

      // Si hay archivos de certificado, subirlos
      if (p12File || certFile || keyFile) {
        const formData = new FormData();
        if (p12File) { formData.append('p12_file', p12File); if (p12Password) formData.append('p12_password', p12Password); }
        if (certFile) formData.append('cert_file', certFile);
        if (keyFile) formData.append('key_file', keyFile);
        await axios.post(`${API}/afip/config/upload-cert`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      toast.success('Configuración AFIP guardada correctamente');
      await fetchAfipConfig();
      setCertFile(null); setKeyFile(null); setP12File(null); setP12Password('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar configuración AFIP');
    } finally {
      setAfipSaving(false);
    }
  };

  const handleTestAfip = async () => {
    setAfipTesting(true);
    setAfipTestResult(null);
    try {
      const res = await axios.post(`${API}/afip/test`);
      setAfipTestResult({ ok: true, data: res.data });
    } catch (err) {
      setAfipTestResult({ ok: false, error: err.response?.data?.detail || 'Error de conexión' });
    } finally {
      setAfipTesting(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'financial', label: 'Finanzas', icon: Calculator },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventario', icon: Archive },
    { id: 'interface', label: 'Interfaz', icon: Grid3X3 },
    { id: 'system', label: 'Sistema', icon: Globe },
    { id: 'receipt', label: 'Recibos', icon: Receipt },
    // { id: 'afip', label: 'ARCA / AFIP', icon: FileText },
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
                      type="text"
                      inputMode="decimal"
                      className="form-input pr-8"
                      value={taxInput}
                      onChange={(e) => setTaxInput(e.target.value)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          updateConfig('tax_rate', val / 100);
                          setTaxInput(String(val));
                        } else {
                          // Revert to current config value
                          setTaxInput(config?.tax_rate != null ? String(config.tax_rate * 100) : '');
                        }
                      }}
                      placeholder="12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
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
                  Impuesto ({((config?.tax_rate ?? 0.12) * 100).toFixed(2)}%): <span className="font-semibold">{config?.currency_symbol}{(10 * (config?.tax_rate ?? 0.12)).toFixed(2)}</span>
                  <br />
                  Total: <span className="font-semibold text-green-600">{config?.currency_symbol}{(10 * (1 + (config?.tax_rate ?? 0.12))).toFixed(2)}</span>
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

                {/* ── Color Theme ── */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Esquema de Colores</h4>
                    </div>
                    <button
                      onClick={handleRestoreDefaults}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Restaurar predeterminados
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Personaliza los tres colores del sistema. Los cambios se aplican de forma inmediata.
                  </p>

                  {/* ── Primary ── */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Color Primario</h5>
                    <p className="text-xs text-gray-500 mb-4">Botón principal, navegación activa, elementos destacados.</p>

                    {/* Preset swatches */}
                    <div className="flex gap-3 mb-4">
                      {COLOR_THEMES.map(theme => {
                        const isActive = config?.primary_color === theme.primary;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme)}
                            title={theme.name}
                            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              isActive
                                ? 'border-gray-700 shadow-md bg-white'
                                : 'border-gray-200 hover:border-gray-400 bg-white'
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}
                            >
                              {isActive && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs text-gray-600 text-center leading-tight">
                              {theme.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Personalizado:
                      </label>
                      <input
                        type="color"
                        value={config?.primary_color || '#10b981'}
                        onChange={(e) => handleCustomColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                      />
                      <span className="text-sm text-gray-500 font-mono">
                        {config?.primary_color || '#10b981'}
                      </span>
                    </div>
                  </div>

                  {/* ── Secondary ── */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Color Secundario</h5>
                    <p className="text-xs text-gray-500 mb-4">Botones de importar, etiquetas de categoría, tags informativos.</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config?.secondary_color || '#60a5fa'}
                        onChange={(e) => handleCustomSecondary(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                      />
                      <span className="text-sm text-gray-500 font-mono">
                        {config?.secondary_color || '#60a5fa'}
                      </span>
                      <span
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{ background: config?.secondary_color || '#60a5fa', color: getContrastColor(config?.secondary_color || '#60a5fa') }}
                      >
                        Vista previa
                      </span>
                    </div>
                  </div>

                  {/* ── Tertiary ── */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Color Terciario</h5>
                    <p className="text-xs text-gray-500 mb-4">Botones de nueva categoría, etiquetas especiales, acciones complementarias.</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config?.tertiary_color || '#c084fc'}
                        onChange={(e) => handleCustomTertiary(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                      />
                      <span className="text-sm text-gray-500 font-mono">
                        {config?.tertiary_color || '#c084fc'}
                      </span>
                      <span
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{ background: config?.tertiary_color || '#c084fc', color: getContrastColor(config?.tertiary_color || '#c084fc') }}
                      >
                        Vista previa
                      </span>
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                      Vista previa del esquema completo
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.dark})`, color: getContrastColor(activeTheme.primary) }}
                      >
                        Primario
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm"
                        style={{ background: config?.secondary_color || '#60a5fa', color: getContrastColor(config?.secondary_color || '#60a5fa') }}
                      >
                        Secundario
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm"
                        style={{ background: config?.tertiary_color || '#c084fc', color: getContrastColor(config?.tertiary_color || '#c084fc') }}
                      >
                        Terciario
                      </button>
                      <span
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border"
                        style={{ background: activeTheme.bg, color: activeTheme.primary, borderColor: activeTheme.primary }}
                      >
                        Badge activo
                      </span>
                      <div
                        className="w-3 h-8 rounded-sm"
                        style={{ background: activeTheme.primary }}
                        title="Borde activo del menú"
                      />
                    </div>
                  </div>
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
                    value="es"
                    disabled
                  >
                    <option value="es">Español</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    Actualmente solo está disponible el español. Soporte multiidioma próximamente.
                  </p>
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
                  <div>IMPUESTO ({((config?.tax_rate ?? 0.12) * 100).toFixed(1)}%):          {config?.currency_symbol}{(2.75 * (config?.tax_rate ?? 0.12)).toFixed(2)}</div>
                  <div className="font-bold">TOTAL:                   {config?.currency_symbol}{(2.75 * (1 + (config?.tax_rate ?? 0.12))).toFixed(2)}</div>
                  <div className="border-t border-dashed my-2"></div>
                  <div className="text-center">
                    {config?.receipt_footer_text || '¡Gracias por su compra!'}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ARCA / AFIP */}
          {activeTab === 'afip' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Factura Electrónica — ARCA / AFIP</h3>
                {afipStatus?.configurado && (
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${afipStatus.ambiente === 'produccion' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {afipStatus.ambiente === 'produccion' ? 'Producción' : 'Homologación'}
                  </span>
                )}
              </div>

              {/* Estado actual */}
              {afipStatus?.configurado && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                  <div className="font-medium mb-1">Estado actual</div>
                  <div>CUIT: <strong>{afipStatus.cuit}</strong> — Punto de Venta: <strong>{afipStatus.punto_venta}</strong></div>
                  <div>Certificado: {afipStatus.tiene_certificado ? '✅ Cargado' : '⚠️ No cargado'} — Clave privada: {afipStatus.tiene_clave ? '✅ Cargada' : '⚠️ No cargada'}</div>
                </div>
              )}

              {/* Datos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">CUIT del comercio (sin guiones)</label>
                  <input type="text" className="form-input" placeholder="20123456789" maxLength={11}
                    value={afipConfig.cuit} onChange={e => setAfipConfig(p => ({ ...p, cuit: e.target.value.replace(/\D/g, '') }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Punto de Venta</label>
                  <input type="number" min={1} className="form-input"
                    value={afipConfig.punto_venta} onChange={e => setAfipConfig(p => ({ ...p, punto_venta: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Razón Social</label>
                  <input type="text" className="form-input" placeholder="Mi Empresa S.A."
                    value={afipConfig.razon_social} onChange={e => setAfipConfig(p => ({ ...p, razon_social: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ambiente</label>
                  <select className="form-select" value={afipConfig.ambiente}
                    onChange={e => setAfipConfig(p => ({ ...p, ambiente: e.target.value }))}>
                    <option value="homologacion">Homologación (pruebas)</option>
                    <option value="produccion">Producción</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de comprobante por defecto</label>
                  <select className="form-select" value={afipConfig.tipo_comprobante_default}
                    onChange={e => setAfipConfig(p => ({ ...p, tipo_comprobante_default: parseInt(e.target.value) }))}>
                    <option value={6}>Factura B — Responsable Inscripto a Consumidor Final</option>
                    <option value={11}>Factura C — Monotributista</option>
                    <option value={1}>Factura A — Entre Responsables Inscriptos (requiere CUIT comprador)</option>
                  </select>
                </div>
              </div>

              {/* Certificados */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Certificado Digital</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Subí el archivo <strong>.p12</strong> (recomendado) o bien el certificado <strong>.pem</strong> y la clave privada <strong>.pem</strong> por separado.
                </p>

                <div className="space-y-3">
                  <div className="form-group">
                    <label className="form-label">Archivo .p12 (certificado + clave)</label>
                    <input type="file" accept=".p12,.pfx" className="form-input"
                      onChange={e => { setP12File(e.target.files[0]); setCertFile(null); setKeyFile(null); }} />
                  </div>
                  {p12File && (
                    <div className="form-group">
                      <label className="form-label">Contraseña del .p12 (si tiene)</label>
                      <input type="password" className="form-input" placeholder="Dejar vacío si no tiene contraseña"
                        value={p12Password} onChange={e => setP12Password(e.target.value)} />
                    </div>
                  )}
                  {!p12File && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Certificado .pem (alternativa)</label>
                        <input type="file" accept=".pem,.crt,.cer" className="form-input"
                          onChange={e => setCertFile(e.target.files[0])} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Clave privada .pem (alternativa)</label>
                        <input type="file" accept=".pem,.key" className="form-input"
                          onChange={e => setKeyFile(e.target.files[0])} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={handleSaveAfip} disabled={afipSaving} className="btn btn-primary">
                  {afipSaving ? <><div className="spinner w-4 h-4" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar config AFIP</>}
                </button>
                {afipStatus?.configurado && afipStatus?.tiene_certificado && afipStatus?.tiene_clave && (
                  <button onClick={handleTestAfip} disabled={afipTesting} className="btn btn-secondary">
                    {afipTesting ? <><div className="spinner w-4 h-4" /> Probando...</> : <><Wifi className="w-4 h-4" /> Probar conexión con ARCA</>}
                  </button>
                )}
              </div>

              {/* Resultado del test */}
              {afipTestResult && (
                <div className={`rounded-lg p-4 text-sm ${afipTestResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                  {afipTestResult.ok ? (
                    <>
                      <div className="font-medium mb-1">✅ Conexión exitosa con ARCA</div>
                      <div>AppServer: {afipTestResult.data?.AppServer} | DbServer: {afipTestResult.data?.DbServer}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium mb-1">❌ Error de conexión</div>
                      <div>{afipTestResult.error}</div>
                    </>
                  )}
                </div>
              )}

              {/* Ayuda */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
                <div className="font-medium text-gray-700 mb-2">Para obtener tu certificado de homologación:</div>
                <div>1. Ingresar a ARCA con CUIT y clave fiscal</div>
                <div>2. Administrador de Relaciones → Gestión de Claves → Nuevo Certificado</div>
                <div>3. Seleccionar "wsfe" como servicio</div>
                <div>4. Descargar el .p12 generado y subirlo aquí</div>
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
          background-color: var(--primary);
        }

        input:focus + .slider {
          box-shadow: 0 0 1px var(--primary);
        }

        input:checked + .slider:before {
          transform: translateX(24px);
        }
      `}</style>
    </div>
  );
};

export default Settings;