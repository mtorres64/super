import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import SettingsView from './SettingsView';

/* ─── Color theme presets ─── */
export const COLOR_THEMES = [
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
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

export const darkenHex = (hex, amount) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v) => Math.max(0, Math.min(255, v));
  return `#${[clamp(rgb.r - amount), clamp(rgb.g - amount), clamp(rgb.b - amount)]
    .map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

export const hexToRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

export const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'white';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155 ? '#1f2937' : 'white';
};

// Applies CSS variables only — does NOT persist to localStorage.
export const applyTheme = (theme) => {
  const root = document.documentElement;
  root.style.setProperty('--primary',        theme.primary);
  root.style.setProperty('--primary-dark',   theme.dark);
  root.style.setProperty('--primary-darker', theme.darker);
  root.style.setProperty('--primary-light',  theme.light);
  root.style.setProperty('--primary-bg',     theme.bg);
  root.style.setProperty('--primary-text',   getContrastColor(theme.primary));
  const _rgb = hexToRgb(theme.primary);
  if (_rgb) root.style.setProperty('--primary-rgb', `${_rgb.r}, ${_rgb.g}, ${_rgb.b}`);
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
export const persistTheme = (theme) => {
  localStorage.setItem('app_theme', JSON.stringify(theme));
};

export const DEFAULT_COLORS = {
  primary_color:   '#10b981',
  secondary_color: '#e0f6ff',
  tertiary_color:  '#ede0ff',
};

export const buildCustomTheme = (color) => ({
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
  const isInitialLoad = useRef(true);
  const autoSaveTimer = useRef(null);
  const [taxInput, setTaxInput] = useState('');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dark_mode') === 'true');

  // Estado AFIP
  const [afipConfig, setAfipConfig] = useState({
    cuit: '', punto_venta: 1, ambiente: 'homologacion',
    tipo_comprobante_default: 6, razon_social: '',
    domicilio_fiscal: '', condicion_iva_emisor: 'RI',
    inicio_actividades: '', iibb: '', concepto_default: 1,
  });
  const [afipStatus, setAfipStatus] = useState(null);
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
      if (data.modal_animations === undefined || data.modal_animations === null) {
        data.modal_animations = localStorage.getItem('modal_animations') !== 'false';
      }
      setConfig(data);
      setTaxInput(data?.tax_rate != null ? String(data.tax_rate * 100) : '');
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

  useEffect(() => {
    if (config === null) return;
    const configValue = config?.modal_animations;
    const enabled = configValue === undefined || configValue === null
      ? localStorage.getItem('modal_animations') !== 'false'
      : configValue !== false;
    document.body.classList.toggle('no-animations', !enabled);
    if (configValue !== undefined && configValue !== null) {
      localStorage.setItem('modal_animations', enabled ? 'true' : 'false');
    }
  }, [config]);

  useEffect(() => {
    if (config === null) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await axios.put(`${API}/config`, config);
        if (config?.primary_color) {
          const preset = COLOR_THEMES.find(t => t.primary === config.primary_color);
          const baseTheme = preset || buildCustomTheme(config.primary_color);
          persistTheme({ ...baseTheme, secondary: config.secondary_color, tertiary: config.tertiary_color });
        }
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Error al guardar configuración');
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [config]);

  const handleRestoreDefaults = () => {
    const newConfig = { ...config, ...DEFAULT_COLORS };
    setConfig(newConfig);
    const preset = COLOR_THEMES.find(t => t.primary === DEFAULT_COLORS.primary_color);
    const baseTheme = preset || buildCustomTheme(DEFAULT_COLORS.primary_color);
    applyTheme({ ...baseTheme, secondary: DEFAULT_COLORS.secondary_color, tertiary: DEFAULT_COLORS.tertiary_color });
    toast.success('Colores restaurados a valores predeterminados');
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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

  const handleDarkModeToggle = (enabled) => {
    setDarkMode(enabled);
    document.documentElement.classList.toggle('dark', enabled);
    localStorage.setItem('dark_mode', enabled ? 'true' : 'false');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', enabled ? '#1e1e1e' : '#ffffff');
  };

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
          domicilio_fiscal: res.data.domicilio_fiscal || '',
          condicion_iva_emisor: res.data.condicion_iva_emisor || 'RI',
          inicio_actividades: res.data.inicio_actividades || '',
          iibb: res.data.iibb || '',
          concepto_default: res.data.concepto_default || 1,
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

  return (
    <SettingsView
      config={config}
      loading={loading}
      saving={saving}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      taxInput={taxInput}
      setTaxInput={setTaxInput}
      afipConfig={afipConfig}
      setAfipConfig={setAfipConfig}
      afipStatus={afipStatus}
      afipSaving={afipSaving}
      afipTesting={afipTesting}
      afipTestResult={afipTestResult}
      certFile={certFile}
      setCertFile={setCertFile}
      keyFile={keyFile}
      setKeyFile={setKeyFile}
      p12File={p12File}
      setP12File={setP12File}
      p12Password={p12Password}
      setP12Password={setP12Password}
      activeTheme={activeTheme}
      handleRestoreDefaults={handleRestoreDefaults}
      updateConfig={updateConfig}
      handleLogoUpdate={handleLogoUpdate}
      handleThemeSelect={handleThemeSelect}
      handleCustomColor={handleCustomColor}
      handleCustomSecondary={handleCustomSecondary}
      handleCustomTertiary={handleCustomTertiary}
      handleSaveAfip={handleSaveAfip}
      handleTestAfip={handleTestAfip}
      darkMode={darkMode}
      onDarkModeToggle={handleDarkModeToggle}
    />
  );
};

export default Settings;
