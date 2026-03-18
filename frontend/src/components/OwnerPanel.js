import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, LogOut, BarChart3, RefreshCw, CheckCircle,
  AlertTriangle, Clock, Ban, ChevronRight,
  ArrowLeft, Plus, Edit3, ToggleLeft, ToggleRight,
  DollarSign, Shield, Settings, Bell, TrendingUp,
  CreditCard, Search, Zap,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const OWNER_API = `${BACKEND_URL}/owner`;
const OWNER_TOKEN_KEY = 'owner_token';

const ownerAxios = axios.create({ baseURL: OWNER_API });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cfg = {
    activa:     { label: 'Activa',     cls: 'bg-green-900/50 text-green-300 border border-green-700' },
    trial:      { label: 'Trial',      cls: 'bg-blue-900/50 text-blue-300 border border-blue-700' },
    vencida:    { label: 'Vencida',    cls: 'bg-red-900/50 text-red-300 border border-red-700' },
    suspendida: { label: 'Suspendida', cls: 'bg-gray-700 text-gray-400 border border-gray-600' },
  };
  const c = cfg[status] || { label: status || 'Sin suscripción', cls: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
};

const formatMoney = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
};

// ─── Login ────────────────────────────────────────────────────────────────────

const LoginView = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await ownerAxios.post('/login', { username, password });
      onLogin(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-900/50">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel del Sistema</h1>
          <p className="text-gray-500 mt-1 text-sm">Acceso exclusivo para el administrador del sistema</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
          {error && (
            <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-600"
                placeholder="Usuario del sistema"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-600"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, color, sub, urgent }) => (
  <div className={`bg-gray-900 border rounded-xl p-5 ${urgent ? 'border-red-800' : 'border-gray-800'}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${urgent ? 'text-red-400' : 'text-white'}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const DashboardView = ({ stats, clientes, onRefresh, onSelectCliente }) => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const mrr = clientes
    .filter(c => c.suscripcion?.status === 'activa')
    .reduce((sum, c) => sum + (c.suscripcion?.precio || 0), 0);

  const nuevosEsteMes = clientes.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const criticos = clientes
    .filter(c =>
      (c.suscripcion?.status === 'activa' || c.suscripcion?.status === 'trial') &&
      c.dias_restantes <= 3 && c.activo
    )
    .sort((a, b) => a.dias_restantes - b.dias_restantes);

  const porVencer7 = clientes
    .filter(c =>
      (c.suscripcion?.status === 'activa' || c.suscripcion?.status === 'trial') &&
      c.dias_restantes > 3 && c.dias_restantes <= 7 && c.activo
    )
    .sort((a, b) => a.dias_restantes - b.dias_restantes);

  const recientes = [...clientes]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Resumen General</h2>
        <button onClick={onRefresh} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clientes" value={stats?.total_clientes} icon={Users} color="bg-indigo-600" />
        <StatCard label="Activas" value={stats?.activas} icon={CheckCircle} color="bg-green-600" />
        <StatCard label="En Trial" value={stats?.trial} icon={Clock} color="bg-blue-600" />
        <StatCard label="Vencidas" value={stats?.vencidas} icon={AlertTriangle} color="bg-red-600" />
        <StatCard label="Suspendidas" value={stats?.suspendidas} icon={Ban} color="bg-gray-600" />
        <StatCard label="Total Recaudado" value={formatMoney(stats?.total_recaudado)} icon={DollarSign} color="bg-emerald-600" sub="Histórico acumulado" />
        <StatCard label="MRR Estimado" value={formatMoney(mrr)} icon={TrendingUp} color="bg-violet-600" sub="Suscripciones activas" />
        <StatCard label="Nuevos este mes" value={nuevosEsteMes} icon={Zap} color="bg-orange-600" />
      </div>

      {/* Vencimiento crítico ≤ 3 días */}
      {criticos.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Vencimiento crítico — {criticos.length} cliente{criticos.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {criticos.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCliente(c.id)}
                className="w-full flex items-center justify-between p-3 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 rounded-lg transition-colors text-left"
              >
                <div>
                  <p className="text-white font-medium text-sm">{c.nombre}</p>
                  <p className="text-red-400 text-xs">{c.admin_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.suscripcion?.status} />
                  <span className="text-red-400 font-bold text-sm">
                    {c.dias_restantes === 0 ? 'HOY' : `${c.dias_restantes}d`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-red-600" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vencen en 4-7 días */}
      {porVencer7.length > 0 && (
        <div className="bg-yellow-950/10 border border-yellow-900/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Vencen en 4–7 días — {porVencer7.length} cliente{porVencer7.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {porVencer7.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCliente(c.id)}
                className="w-full flex items-center justify-between p-3 bg-yellow-950/20 hover:bg-yellow-950/40 border border-yellow-900/20 rounded-lg transition-colors text-left"
              >
                <div>
                  <p className="text-white font-medium text-sm">{c.nombre}</p>
                  <p className="text-gray-500 text-xs">{c.admin_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.suscripcion?.status} />
                  <span className="text-yellow-400 font-bold text-sm">{c.dias_restantes}d</span>
                  <ChevronRight className="w-4 h-4 text-yellow-700" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clientes más recientes */}
      {recientes.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Clientes más recientes
          </h3>
          <div className="space-y-2">
            {recientes.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCliente(c.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-800/40 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-300 font-bold text-xs">{c.nombre[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.nombre}</p>
                    <p className="text-gray-500 text-xs">{formatDate(c.created_at)}</p>
                  </div>
                </div>
                <StatusBadge status={c.suscripcion?.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Cliente List ─────────────────────────────────────────────────────────────

const ClientesListView = ({ clientes, onSelect, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');

  const statusCounts = {
    all: clientes.length,
    activa: clientes.filter(c => c.suscripcion?.status === 'activa').length,
    trial: clientes.filter(c => c.suscripcion?.status === 'trial').length,
    vencida: clientes.filter(c => c.suscripcion?.status === 'vencida').length,
    suspendida: clientes.filter(c => c.suscripcion?.status === 'suspendida').length,
  };

  const filtered = clientes
    .filter(c => {
      const matchSearch = !search ||
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (c.admin_email || '').toLowerCase().includes(search.toLowerCase());
      const status = c.suscripcion?.status || 'sin_suscripcion';
      const matchStatus = filterStatus === 'all' || status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nombre_asc': return a.nombre.localeCompare(b.nombre);
        case 'nombre_desc': return b.nombre.localeCompare(a.nombre);
        case 'vencimiento_asc': return (a.dias_restantes ?? 999) - (b.dias_restantes ?? 999);
        case 'vencimiento_desc': return (b.dias_restantes ?? 0) - (a.dias_restantes ?? 0);
        case 'created_asc': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  const statusPills = [
    { key: 'all', label: 'Todos', activeCls: 'bg-indigo-700 text-white border-indigo-600' },
    { key: 'activa', label: 'Activa', activeCls: 'bg-green-950/60 text-green-300 border-green-700' },
    { key: 'trial', label: 'Trial', activeCls: 'bg-blue-950/60 text-blue-300 border-blue-700' },
    { key: 'vencida', label: 'Vencida', activeCls: 'bg-red-950/60 text-red-300 border-red-700' },
    { key: 'suspendida', label: 'Suspendida', activeCls: 'bg-gray-800 text-gray-400 border-gray-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">
          Clientes <span className="text-gray-500 font-normal">({clientes.length})</span>
        </h2>
        <button onClick={onRefresh} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="created_desc">Más recientes primero</option>
          <option value="created_asc">Más antiguos primero</option>
          <option value="vencimiento_asc">Vencen antes</option>
          <option value="vencimiento_desc">Vencen después</option>
          <option value="nombre_asc">Nombre A–Z</option>
          <option value="nombre_desc">Nombre Z–A</option>
        </select>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {statusPills.map(p => (
          <button
            key={p.key}
            onClick={() => setFilterStatus(p.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterStatus === p.key
                ? p.activeCls
                : 'text-gray-500 border-gray-800 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            {p.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === p.key ? 'bg-white/20' : 'bg-gray-800 text-gray-500'}`}>
              {statusCounts[p.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          const status = c.suscripcion?.status || 'sin_suscripcion';
          const dias = c.dias_restantes ?? 0;
          const isSuspendida = status === 'suspendida';
          const diasColor = isSuspendida ? 'text-gray-500' : dias <= 3 ? 'text-red-400' : dias <= 7 ? 'text-yellow-400' : 'text-gray-500';
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-700 rounded-xl p-4 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.activo ? 'bg-indigo-900' : 'bg-gray-700'}`}>
                  <span className={`font-bold text-sm ${c.activo ? 'text-indigo-300' : 'text-gray-500'}`}>
                    {c.nombre[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${c.activo ? 'text-white' : 'text-gray-500'}`}>{c.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {c.admin_email || 'Sin email'} · Reg: {formatDate(c.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <div className="text-right hidden sm:block">
                  <StatusBadge status={status} />
                  <p className={`text-xs mt-1 ${diasColor}`}>
                    {isSuspendida ? 'Suspendida' : dias > 0 ? `${dias} días` : 'Vencida'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            {clientes.length === 0 ? 'No hay clientes registrados' : 'No se encontraron clientes con ese filtro'}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Cliente Detalle ──────────────────────────────────────────────────────────

const ClienteDetalleView = ({ clienteId, token, onBack }) => {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showSuscModal, setShowSuscModal] = useState(false);
  const [pagoForm, setPagoForm] = useState({ monto: '', concepto: '', plan_tipo: 'mensual' });
  const [suscForm, setSuscForm] = useState({ status: '', dias_extra: '', fecha_vencimiento: '', precio: '' });
  const [extMsg, setExtMsg] = useState(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadCliente = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerAxios.get(`/clientes/${clienteId}`, authHeader);
      setCliente(res.data);
      const sus = res.data.suscripcion;
      setSuscForm({
        status: sus?.status || '',
        dias_extra: '',
        fecha_vencimiento: '',
        precio: sus?.precio != null ? String(sus.precio) : '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]); // eslint-disable-line

  useEffect(() => { loadCliente(); }, [loadCliente]);

  const toggleActivo = async () => {
    if (!window.confirm(`¿${cliente.activo ? 'Suspender' : 'Activar'} la empresa "${cliente.nombre}"?`)) return;
    setActionLoading(true);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/activo`, {}, authHeader);
      await loadCliente();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cambiar estado');
    } finally {
      setActionLoading(false);
    }
  };

  const quickExtend = async (dias) => {
    setActionLoading(true);
    setExtMsg(null);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/suscripcion`, { dias_extra: dias }, authHeader);
      setExtMsg({ ok: true, text: `+${dias} días agregados correctamente` });
      await loadCliente();
    } catch (err) {
      setExtMsg({ ok: false, text: err.response?.data?.detail || 'Error al extender' });
    } finally {
      setActionLoading(false);
    }
  };

  const submitPago = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await ownerAxios.post(`/clientes/${clienteId}/pago`, {
        monto: parseFloat(pagoForm.monto),
        concepto: pagoForm.concepto,
        plan_tipo: pagoForm.plan_tipo,
      }, authHeader);
      setShowPagoModal(false);
      setPagoForm({ monto: '', concepto: '', plan_tipo: 'mensual' });
      await loadCliente();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setActionLoading(false);
    }
  };

  const submitSuscripcion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const payload = {};
    if (suscForm.status) payload.status = suscForm.status;
    if (suscForm.dias_extra) payload.dias_extra = parseInt(suscForm.dias_extra);
    if (suscForm.fecha_vencimiento) payload.fecha_vencimiento = suscForm.fecha_vencimiento + 'T12:00:00Z';
    if (suscForm.precio !== '') payload.precio = parseFloat(suscForm.precio);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/suscripcion`, payload, authHeader);
      setShowSuscModal(false);
      await loadCliente();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join('\n')
          : 'Error al actualizar suscripción';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  if (!cliente) return <div className="text-red-400 p-4">Cliente no encontrado</div>;

  const sus = cliente.suscripcion;
  const dias = cliente.dias_restantes ?? 0;
  const diasColor = dias <= 3 ? 'text-red-400' : dias <= 7 ? 'text-yellow-400' : 'text-green-400';
  const pagosAprobados = cliente.pagos?.filter(p => p.estado === 'approved') ?? [];
  const totalPagado = pagosAprobados.reduce((s, p) => s + (p.monto || 0), 0);

  const quickExtendOptions = [
    { dias: 7, label: '+7d' },
    { dias: 30, label: '+30d' },
    { dias: 90, label: '+3m' },
    { dias: 180, label: '+6m' },
    { dias: 365, label: '+1 año' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{cliente.nombre}</h2>
          <p className="text-sm text-gray-500">{cliente.admin_email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPagoModal(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Registrar pago
          </button>
          <button
            onClick={() => setShowSuscModal(true)}
            className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Suscripción
          </button>
          <button
            onClick={toggleActivo}
            disabled={actionLoading}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors border disabled:opacity-50 ${
              cliente.activo
                ? 'bg-red-950/40 hover:bg-red-950/70 text-red-400 border-red-900'
                : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-400 border-emerald-900'
            }`}
          >
            {cliente.activo ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            {cliente.activo ? 'Suspender' : 'Reactivar'}
          </button>
        </div>
      </div>

      {/* Quick extend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Extensión rápida</p>
        <div className="flex flex-wrap gap-2">
          {quickExtendOptions.map(({ dias: d, label }) => (
            <button
              key={d}
              onClick={() => quickExtend(d)}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800 text-indigo-300 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Zap className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
        {extMsg && (
          <p className={`text-xs mt-2 ${extMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{extMsg.text}</p>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Company */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Datos del Cliente</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Estado empresa</dt>
              <dd className={`text-sm font-medium ${cliente.activo ? 'text-green-400' : 'text-red-400'}`}>
                {cliente.activo ? 'Activa' : 'Suspendida'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Administrador</dt>
              <dd className="text-sm text-gray-200">{cliente.admin_nombre || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm text-gray-200">{cliente.admin_email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Fecha de registro</dt>
              <dd className="text-sm text-gray-200">{formatDate(cliente.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Pagos aprobados</dt>
              <dd className="text-sm text-gray-200">{pagosAprobados.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total pagado</dt>
              <dd className="text-sm text-emerald-400 font-semibold">{formatMoney(totalPagado)}</dd>
            </div>
          </dl>
        </div>

        {/* Subscription */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Suscripción</h3>
          {sus ? (
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-500">Estado</dt>
                <dd><StatusBadge status={sus.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Plan</dt>
                <dd className="text-sm text-gray-200">{sus.plan_nombre}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Tipo</dt>
                <dd className="text-sm text-gray-200 capitalize">{sus.plan_tipo || 'mensual'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Precio</dt>
                <dd className="text-sm text-gray-200">
                  {formatMoney(sus.precio)}/{sus.plan_tipo === 'anual' ? 'año' : 'mes'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Inicio</dt>
                <dd className="text-sm text-gray-200">{formatDate(sus.fecha_inicio)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Vencimiento</dt>
                <dd className={`text-sm font-medium ${diasColor}`}>{formatDate(sus.fecha_vencimiento)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Días restantes</dt>
                <dd className={`text-sm font-bold ${diasColor}`}>{dias} días</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-600 text-sm">Sin suscripción registrada</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Historial de Pagos ({cliente.pagos?.length ?? 0})
        </h3>
        {cliente.pagos?.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Fecha</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Concepto</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Monto</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Tipo</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Estado</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Período</th>
                </tr>
              </thead>
              <tbody>
                {cliente.pagos.map(p => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-2 text-gray-400">{formatDate(p.fecha)}</td>
                    <td className="py-3 px-2 text-gray-200">{p.concepto}</td>
                    <td className="py-3 px-2 text-emerald-400 font-semibold">{formatMoney(p.monto)}</td>
                    <td className="py-3 px-2 text-gray-400 text-xs capitalize">{p.plan_tipo || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estado === 'approved' ? 'bg-green-900/40 text-green-300' :
                        p.estado === 'pending'  ? 'bg-yellow-900/40 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {p.estado === 'approved' ? 'Aprobado' : p.estado === 'pending' ? 'Pendiente' : p.estado}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs">
                      {p.periodo_inicio && p.periodo_fin
                        ? `${formatDate(p.periodo_inicio)} → ${formatDate(p.periodo_fin)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-sm">Sin pagos registrados</p>
        )}
      </div>

      {/* Modal: Registrar Pago */}
      {showPagoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5">Registrar Pago Manual</h3>
            <form onSubmit={submitPago} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Monto (ARS)</label>
                <input
                  type="number"
                  value={pagoForm.monto}
                  onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="20000"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Concepto</label>
                <input
                  type="text"
                  value={pagoForm.concepto}
                  onChange={e => setPagoForm({ ...pagoForm, concepto: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Plan Mensual - ${new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tipo de plan</label>
                <select
                  value={pagoForm.plan_tipo}
                  onChange={e => setPagoForm({ ...pagoForm, plan_tipo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="mensual">Mensual (1 mes desde día de facturación)</option>
                  <option value="anual">Anual (12 meses desde día de facturación)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPagoModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Suscripción */}
      {showSuscModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5">Editar Suscripción</h3>
            <form onSubmit={submitSuscripcion} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Cambiar estado</label>
                <select
                  value={suscForm.status}
                  onChange={e => setSuscForm({ ...suscForm, status: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin cambio</option>
                  <option value="activa">Activa</option>
                  <option value="trial">Trial</option>
                  <option value="vencida">Vencida</option>
                  <option value="suspendida">Suspendida</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Agregar días (desde el vencimiento actual o hoy)</label>
                <input
                  type="number"
                  value={suscForm.dias_extra}
                  onChange={e => setSuscForm({ ...suscForm, dias_extra: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: 30"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">O establecer fecha exacta de vencimiento</label>
                <input
                  type="date"
                  value={suscForm.fecha_vencimiento}
                  onChange={e => setSuscForm({ ...suscForm, fecha_vencimiento: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Precio del plan (ARS)</label>
                <input
                  type="number"
                  value={suscForm.precio}
                  onChange={e => setSuscForm({ ...suscForm, precio: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dejar vacío para no cambiar"
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSuscModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Cobros ───────────────────────────────────────────────────────────────────

const CobrosView = ({ token }) => {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMes, setFilterMes] = useState('');

  const loadPagos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerAxios.get('/pagos', authHeader);
      setPagos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line

  useEffect(() => { loadPagos(); }, [loadPagos]);

  const meses = [...new Set(
    pagos
      .map(p => {
        if (!p.fecha) return null;
        const d = new Date(p.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
      .filter(Boolean)
  )].sort().reverse();

  const filtered = pagos.filter(p => {
    const matchSearch = !search ||
      (p.empresa_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.concepto || '').toLowerCase().includes(search.toLowerCase());
    const matchMes = !filterMes || (p.fecha && new Date(p.fecha).toISOString().startsWith(filterMes));
    return matchSearch && matchMes;
  });

  const aprobados = filtered.filter(p => p.estado === 'approved');
  const totalFiltrado = aprobados.reduce((s, p) => s + (p.monto || 0), 0);

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Cobros <span className="text-gray-500 font-normal">({pagos.length})</span>
        </h2>
        <button onClick={loadPagos} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por empresa o concepto..."
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
          />
        </div>
        <select
          value={filterMes}
          onChange={e => setFilterMes(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los meses</option>
          {meses.map(m => {
            const [year, month] = m.split('-');
            const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>
      </div>

      {/* Summary card */}
      {filtered.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total cobrado</p>
            <p className="text-2xl font-bold text-emerald-400">{formatMoney(totalFiltrado)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Transacciones aprobadas</p>
            <p className="text-2xl font-bold text-white">{aprobados.length}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Fecha</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Empresa</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Concepto</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Monto</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Tipo</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-2 text-gray-400">{formatDate(p.fecha)}</td>
                    <td className="py-3 px-2 text-white font-medium">{p.empresa_nombre}</td>
                    <td className="py-3 px-2 text-gray-300">{p.concepto}</td>
                    <td className="py-3 px-2 text-emerald-400 font-semibold">{formatMoney(p.monto)}</td>
                    <td className="py-3 px-2 text-gray-400 text-xs capitalize">{p.plan_tipo || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estado === 'approved' ? 'bg-green-900/40 text-green-300' :
                        p.estado === 'pending'  ? 'bg-yellow-900/40 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {p.estado === 'approved' ? 'Aprobado' : p.estado === 'pending' ? 'Pendiente' : p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-600 py-12">No hay cobros para mostrar</p>
        )}
      </div>
    </div>
  );
};

// ─── Config ───────────────────────────────────────────────────────────────────

const ConfigView = ({ token }) => {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [precio, setPrecio] = useState('');
  const [planNombre, setPlanNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [trialDias, setTrialDias] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    ownerAxios.get('/config', authHeader).then(res => {
      setPrecio(String(res.data.suscripcion_precio));
      setPlanNombre(res.data.suscripcion_plan_nombre);
      setWhatsapp(res.data.whatsapp_numero || '');
      setTrialDias(String(res.data.trial_dias ?? 15));
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await ownerAxios.put('/config', {
        suscripcion_precio: parseFloat(precio),
        suscripcion_plan_nombre: planNombre,
        whatsapp_numero: whatsapp,
        trial_dias: parseInt(trialDias),
      }, authHeader);
      setMsg({ ok: true, text: 'Configuración guardada.' });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.detail || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const precioAnual = precio ? Math.round(parseFloat(precio) * 12 * 0.8) : 0;

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-6">Configuración del Sistema</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre del plan</label>
            <input
              type="text"
              value={planNombre}
              onChange={e => setPlanNombre(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">WhatsApp de contacto / pagos</label>
            <input
              type="text"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+5493811234567"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Formato internacional, ej: +5493815156095. Se muestra como botón en la página de Cuenta.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Días del período de prueba (trial)</label>
            <input
              type="number"
              value={trialDias}
              onChange={e => setTrialDias(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              max="365"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Días que dura el trial al registrar una empresa nueva.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Precio mensual (ARS)</label>
            <input
              type="number"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Precio anual con 20% descuento (ARS)</label>
            <input
              type="text"
              value={precioAnual ? formatMoney(precioAnual) : '—'}
              disabled
              className="w-full bg-gray-800/40 border border-gray-800 text-gray-500 rounded-lg px-4 py-2.5 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">
              Calculado como precio mensual × 12 × 0.8 — referencia para cobros anuales
            </p>
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Alertas ──────────────────────────────────────────────────────────────────

const AlertasView = ({ token, onSelectCliente, onAlertsChanged }) => {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerAxios.get('/alertas', authHeader);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) return;
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line

  useEffect(() => { loadData(); }, [loadData]);

  const generarAlertas = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await ownerAxios.post('/alertas/generar', {}, authHeader);
      setMsg({ ok: true, text: `Listo. Se generaron ${res.data.generadas} alertas nuevas.` });
      loadData();
      onAlertsChanged?.();
    } catch {
      setMsg({ ok: false, text: 'Error al generar alertas.' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  const porVencer = data?.por_vencer || [];
  const alertasRecientes = data?.alertas_recientes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Alertas de vencimiento</h2>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={generarAlertas}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {generating ? 'Generando...' : 'Generar alertas ahora'}
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm px-4 py-2 rounded-lg ${msg.ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
          {msg.text}
        </p>
      )}

      {/* Empresas por vencer */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Vencen en los próximos 10 días ({porVencer.length})
        </h3>
        {porVencer.length === 0 ? (
          <p className="text-gray-600 text-sm">Ningún cliente vence en los próximos 10 días</p>
        ) : (
          <div className="space-y-2">
            {porVencer.map((item) => (
              <button
                key={item.empresa_id}
                onClick={() => onSelectCliente(item.empresa_id)}
                className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
              >
                <div>
                  <p className="text-white font-medium text-sm">{item.empresa_nombre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {item.plan_nombre} · Vence: {formatDate(item.fecha_vencimiento)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className={`text-sm font-bold ${
                    item.dias_restantes <= 2 ? 'text-red-400' :
                    item.dias_restantes <= 5 ? 'text-orange-400' : 'text-yellow-400'
                  }`}>
                    {item.dias_restantes === 0 ? 'Hoy' : `${item.dias_restantes}d`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alertas recientes enviadas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Últimas alertas enviadas
        </h3>
        {alertasRecientes.length === 0 ? (
          <p className="text-gray-600 text-sm">No hay alertas generadas aún</p>
        ) : (
          <div className="space-y-2">
            {alertasRecientes.slice(0, 20).map((a, i) => (
              <div key={a.id || i} className="flex items-start justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{a.titulo}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{a.mensaje}</p>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.leida
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-indigo-900/50 text-indigo-300 border border-indigo-800'
                  }`}>
                    {a.leida ? 'Leída' : 'Sin leer'}
                  </span>
                  <p className="text-gray-600 text-xs mt-1">{formatDate(a.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main OwnerPanel ──────────────────────────────────────────────────────────

const OwnerPanel = () => {
  const [token, setToken] = useState(localStorage.getItem(OWNER_TOKEN_KEY));
  const [view, setView] = useState('dashboard');
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [stats, setStats] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const handleLogout = useCallback(() => {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    setToken(null);
    setView('dashboard');
    setSelectedClienteId(null);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await ownerAxios.get('/stats', authHeader);
      setStats(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  }, [token]); // eslint-disable-line

  const loadClientes = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await ownerAxios.get('/clientes', authHeader);
      setClientes(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoadingData(false);
    }
  }, [token]); // eslint-disable-line

  const handleLogin = (tok) => {
    localStorage.setItem(OWNER_TOKEN_KEY, tok);
    setToken(tok);
  };

  const selectCliente = (id) => {
    setSelectedClienteId(id);
    setView('cliente_detalle');
  };

  useEffect(() => {
    if (!token) return;
    loadStats();
    loadClientes();
  }, [token, loadStats, loadClientes]);

  if (!token) return <LoginView onLogin={handleLogin} />;

  const urgentCount = clientes.filter(c =>
    (c.suscripcion?.status === 'activa' || c.suscripcion?.status === 'trial') &&
    c.dias_restantes <= 3 && c.activo
  ).length;

  const isClienteView = view === 'clientes' || view === 'cliente_detalle';

  const navItems = [
    { key: 'dashboard', icon: BarChart3, label: 'Resumen', badge: urgentCount > 0 ? urgentCount : null, urgentBadge: true },
    { key: 'clientes', icon: Users, label: 'Clientes', badge: clientes.length > 0 ? clientes.length : null },
    { key: 'cobros', icon: CreditCard, label: 'Cobros' },
    { key: 'alertas', icon: Bell, label: 'Alertas', badge: stats?.alertas_sin_leer > 0 ? stats.alertas_sin_leer : null, urgentBadge: true },
    { key: 'config', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">

      {/* Mobile top bar */}
      <div className="md:hidden bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Panel Sistema</p>
            <p className="text-gray-600 text-xs">Administrador</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-56 bg-gray-900 border-r border-gray-800 flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Panel Sistema</p>
              <p className="text-gray-600 text-xs">Administrador</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = item.key === 'clientes' ? isClienteView : view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setSelectedClienteId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? 'bg-indigo-700 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {item.badge != null && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-indigo-500 text-white'
                      : item.urgentBadge
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        {loadingData && view === 'dashboard' ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : view === 'dashboard' ? (
          <DashboardView
            stats={stats}
            clientes={clientes}
            onRefresh={() => { loadStats(); loadClientes(); }}
            onSelectCliente={selectCliente}
          />
        ) : view === 'clientes' ? (
          <ClientesListView
            clientes={clientes}
            onSelect={selectCliente}
            onRefresh={loadClientes}
          />
        ) : view === 'cliente_detalle' && selectedClienteId ? (
          <ClienteDetalleView
            clienteId={selectedClienteId}
            token={token}
            onBack={() => { setView('clientes'); setSelectedClienteId(null); }}
          />
        ) : view === 'cobros' ? (
          <CobrosView token={token} />
        ) : view === 'alertas' ? (
          <AlertasView token={token} onSelectCliente={selectCliente} onAlertsChanged={loadStats} />
        ) : view === 'config' ? (
          <ConfigView token={token} />
        ) : null}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex z-20">
        {navItems.map(item => {
          const active = item.key === 'clientes' ? isClienteView : view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { setView(item.key); setSelectedClienteId(null); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                active ? 'text-indigo-400' : 'text-gray-600'
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge != null && (
                  <span className={`absolute -top-1.5 -right-1.5 text-xs px-1 py-0 rounded-full leading-4 min-w-[1rem] text-center ${
                    item.urgentBadge ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default OwnerPanel;
