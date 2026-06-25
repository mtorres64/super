import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, LogOut, BarChart3, RefreshCw, CheckCircle,
  AlertTriangle, Clock, Ban, ChevronRight, ChevronDown,
  ArrowLeft, Plus, Edit3, ToggleLeft, ToggleRight,
  DollarSign, Shield, Settings, Bell, TrendingUp,
  CreditCard, Search, Zap, ZapOff, CheckCircle2, LogIn, X, Eye, EyeOff, Trash2,
} from 'lucide-react';
import { ownerAxios, formatDate, formatMoney } from './index';
import SortIcon from '../ui/SortIcon';
import { useSortableData } from '../../hooks/useSortableData';

// ─── StatusBadge ─────────────────────────────────────────────────────────────

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

// ─── LoginView ────────────────────────────────────────────────────────────────

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

// ─── DashboardView ────────────────────────────────────────────────────────────

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

// ─── ClientesListView ─────────────────────────────────────────────────────────

const ClientesListView = ({ clientes, onSelect, onRefresh, onCreateCliente }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ empresa_nombre: '', admin_nombre: '', admin_email: '', admin_password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await onCreateCliente(createForm);
      setShowCreateModal(false);
      setCreateForm({ empresa_nombre: '', admin_nombre: '', admin_email: '', admin_password: '' });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      if (Array.isArray(detail)) {
        setCreateError(detail.map(d => d.msg).join(', '));
      } else if (typeof detail === 'string') {
        setCreateError(detail);
      } else if (err.message) {
        setCreateError(`Error ${status ? `(${status})` : ''}: ${err.message}`);
      } else {
        setCreateError('Error desconocido al crear la cuenta');
      }
    } finally {
      setCreateLoading(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button
            onClick={() => { setCreateError(''); setShowCreateModal(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva cuenta
          </button>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">Nueva cuenta</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre de la empresa</label>
                <input
                  type="text"
                  required
                  value={createForm.empresa_nombre}
                  onChange={e => setCreateForm(f => ({ ...f, empresa_nombre: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Almacén Don Pedro"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del administrador</label>
                <input
                  type="text"
                  required
                  value={createForm.admin_nombre}
                  onChange={e => setCreateForm(f => ({ ...f, admin_nombre: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Pedro García"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.admin_email}
                  onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin@empresa.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createForm.admin_password}
                    onChange={e => setCreateForm(f => ({ ...f, admin_password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors">
                  {createLoading ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

// ─── ModulosPanel ────────────────────────────────────────────────────────────

const ALL_MODULES = [
  { id: 'pos',           label: 'POS / Ventas' },
  { id: 'caja',          label: 'Caja' },
  { id: 'inventario',    label: 'Inventario' },
  { id: 'clientes',      label: 'Clientes' },
  { id: 'facturacion',   label: 'Facturación Electrónica' },
  { id: 'reportes',      label: 'Reportes de Ventas' },
  { id: 'compras',       label: 'Compras y Proveedores' },
  { id: 'alertas_stock', label: 'Alertas de Stock' },
  { id: 'usuarios',      label: 'Usuarios y Roles' },
  { id: 'multi_sucursal',label: 'Multi-sucursal' },
  { id: 'configuracion', label: 'Configuración' },
  { id: 'notificaciones',label: 'Notificaciones' },
];

const PLAN_MODULES_DEF = {
  emprendedor: ['pos', 'caja', 'inventario', 'notificaciones'],
  profesional: ['pos', 'caja', 'inventario', 'clientes', 'facturacion', 'reportes', 'compras', 'alertas_stock', 'usuarios', 'configuracion', 'notificaciones'],
  empresarial: ['pos', 'caja', 'inventario', 'clientes', 'facturacion', 'reportes', 'compras', 'alertas_stock', 'usuarios', 'multi_sucursal', 'configuracion', 'notificaciones'],
};

const PLAN_TIERS = [
  { id: 'emprendedor', label: 'Emprendedor' },
  { id: 'profesional', label: 'Profesional' },
  { id: 'empresarial', label: 'Empresarial' },
];

const ModulosPanel = ({ cliente, updatingModulos, moduleMsg, onToggleModulo, onChangePlanTier }) => {
  const planTier = cliente.plan_tier || 'profesional';
  const modulosActivos = cliente.modules_activos || [];
  const modulosExtra = cliente.modules_extra || [];
  const modulosRemovidos = cliente.modules_removidos || [];
  const planBase = PLAN_MODULES_DEF[planTier] || [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulos y Plan</h3>
        {moduleMsg && (
          <p className={`text-xs ${moduleMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{moduleMsg.text}</p>
        )}
      </div>

      {/* Selector de plan tier */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 mb-2">Plan base</p>
        <div className="flex gap-2 flex-wrap">
          {PLAN_TIERS.map(p => (
            <button
              key={p.id}
              onClick={() => onChangePlanTier(p.id)}
              disabled={updatingModulos || planTier === p.id}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:cursor-not-allowed ${
                planTier === p.id
                  ? 'bg-indigo-700 border-indigo-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_MODULES.map(mod => {
          const enPlanBase = planBase.includes(mod.id);
          const esExtra = modulosExtra.includes(mod.id);
          const esRemovido = modulosRemovidos.includes(mod.id);
          const activo = modulosActivos.includes(mod.id);

          let badge = null;
          if (esExtra)        badge = <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-700">+owner</span>;
          else if (esRemovido) badge = <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800">-owner</span>;
          else if (enPlanBase) badge = <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">plan</span>;

          return (
            <div
              key={mod.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                activo
                  ? 'bg-gray-800/60 border-gray-700'
                  : 'bg-gray-900 border-gray-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activo ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-sm text-gray-200 truncate">{mod.label}</span>
                {badge}
              </div>
              <button
                onClick={() => onToggleModulo(mod.id)}
                disabled={updatingModulos}
                className={`ml-3 flex-shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                  activo ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={activo ? 'Desactivar módulo' : 'Activar módulo'}
              >
                <span className={`block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-auto ${
                  activo ? 'translate-x-2' : '-translate-x-1'
                }`} />
              </button>
            </div>
          );
        })}
      </div>

      {(modulosExtra.length > 0 || modulosRemovidos.length > 0) && (
        <p className="text-xs text-gray-600 mt-3">
          Overrides activos: {modulosExtra.length > 0 && `+${modulosExtra.length} añadidos`}{modulosExtra.length > 0 && modulosRemovidos.length > 0 && ', '}{modulosRemovidos.length > 0 && `${modulosRemovidos.length} removidos`}
        </p>
      )}
    </div>
  );
};

// ─── ClienteDetalleView ───────────────────────────────────────────────────────

const ClienteDetalleView = ({ clienteId, token, onBack, onDelete }) => {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showSuscModal, setShowSuscModal] = useState(false);
  const [pagoForm, setPagoForm] = useState({ monto: '', concepto: '', plan_tipo: 'mensual' });
  const [suscForm, setSuscForm] = useState({ status: '', dias_extra: '', fecha_vencimiento: '', precio: '' });
  const [extMsg, setExtMsg] = useState(null);
  const [cancelandoPreapproval, setCancelandoPreapproval] = useState(false);
  const [moduleMsg, setModuleMsg] = useState(null);
  const [updatingModulos, setUpdatingModulos] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [editingDatos, setEditingDatos] = useState(false);
  const [datosForm, setDatosForm] = useState({ empresa_nombre: '', admin_nombre: '', admin_email: '' });
  const [datosLoading, setDatosLoading] = useState(false);
  const [datosMsg, setDatosMsg] = useState(null);

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

  const handleImpersonate = () => setShowImpersonateModal(true);

  const handleEditDatos = () => {
    setDatosForm({
      empresa_nombre: cliente.nombre || '',
      admin_nombre: cliente.admin_nombre || '',
      admin_email: cliente.admin_email || '',
    });
    setDatosMsg(null);
    setEditingDatos(true);
  };

  const handleSaveDatos = async (e) => {
    e.preventDefault();
    setDatosLoading(true);
    setDatosMsg(null);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/datos`, {
        empresa_nombre: datosForm.empresa_nombre,
        admin_nombre: datosForm.admin_nombre,
        admin_email: datosForm.admin_email,
      }, authHeader);
      setDatosMsg({ ok: true, text: 'Datos actualizados correctamente' });
      setEditingDatos(false);
      await loadCliente();
    } catch (err) {
      setDatosMsg({ ok: false, text: err.response?.data?.detail || 'Error al actualizar datos' });
    } finally {
      setDatosLoading(false);
    }
  };

  const confirmImpersonate = async () => {
    setShowImpersonateModal(false);
    setActionLoading(true);
    try {
      const res = await ownerAxios.post(`/impersonate/${clienteId}`, {}, authHeader);
      localStorage.setItem('impersonation_active', 'true');
      localStorage.setItem('impersonation_empresa_nombre', res.data.empresa_nombre);
      localStorage.setItem('token', res.data.access_token);
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al ingresar como administrador');
      setActionLoading(false);
    }
  };

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

  const cancelarPreapproval = async () => {
    if (!window.confirm('¿Cancelar el débito automático de este cliente en MercadoPago?')) return;
    setCancelandoPreapproval(true);
    try {
      await ownerAxios.post(`/clientes/${clienteId}/suscripcion/cancelar-preapproval`, {}, authHeader);
      await loadCliente();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cancelar el débito automático');
    } finally {
      setCancelandoPreapproval(false);
    }
  };

  const toggleModulo = async (moduloId) => {
    const extra = cliente.modules_extra || [];
    const removidos = cliente.modules_removidos || [];
    const planTier = cliente.plan_tier || 'profesional';
    const PLAN_MODULES = {
      emprendedor: ['pos', 'caja', 'inventario', 'notificaciones'],
      profesional: ['pos', 'caja', 'inventario', 'clientes', 'facturacion', 'reportes', 'compras', 'alertas_stock', 'usuarios', 'configuracion', 'notificaciones'],
      empresarial: ['pos', 'caja', 'inventario', 'clientes', 'facturacion', 'reportes', 'compras', 'alertas_stock', 'usuarios', 'multi_sucursal', 'configuracion', 'notificaciones'],
    };
    const enPlanBase = (PLAN_MODULES[planTier] || []).includes(moduloId);
    const esExtra = extra.includes(moduloId);
    const esRemovido = removidos.includes(moduloId);

    let newExtra = [...extra];
    let newRemovidos = [...removidos];

    if (enPlanBase && !esRemovido) {
      // Activo por plan → remover (añadir a removidos)
      newRemovidos = [...newRemovidos, moduloId];
    } else if (esExtra) {
      // Activo por override extra → quitar extra
      newExtra = newExtra.filter(m => m !== moduloId);
    } else if (esRemovido) {
      // Removido del plan → restaurar (quitar de removidos)
      newRemovidos = newRemovidos.filter(m => m !== moduloId);
    } else {
      // No está en plan y no es extra → añadir como extra
      newExtra = [...newExtra, moduloId];
    }

    setUpdatingModulos(true);
    setModuleMsg(null);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/modulos`, {
        modules_extra: newExtra,
        modules_removidos: newRemovidos,
      }, authHeader);
      setModuleMsg({ ok: true, text: 'Módulos actualizados' });
      await loadCliente();
    } catch (err) {
      setModuleMsg({ ok: false, text: err.response?.data?.detail || 'Error al actualizar módulos' });
    } finally {
      setUpdatingModulos(false);
    }
  };

  const changePlanTier = async (newTier) => {
    setUpdatingModulos(true);
    setModuleMsg(null);
    try {
      await ownerAxios.put(`/clientes/${clienteId}/suscripcion`, { plan_tier: newTier }, authHeader);
      setModuleMsg({ ok: true, text: `Plan cambiado a ${newTier}` });
      await loadCliente();
    } catch (err) {
      setModuleMsg({ ok: false, text: err.response?.data?.detail || 'Error al cambiar plan' });
    } finally {
      setUpdatingModulos(false);
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

  const { sortedItems: sortedClientePagos, sortConfig: pagosSortConfig, requestSort: pagosRequestSort } = useSortableData(cliente?.pagos || []);

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
            onClick={handleImpersonate}
            disabled={actionLoading}
            className="flex items-center gap-1.5 bg-orange-700 hover:bg-orange-600 text-white text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            title="Ingresar al sistema como administrador de esta empresa"
          >
            <LogIn className="w-4 h-4" /> Entrar como Admin
          </button>
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
          <button
            onClick={() => { setDeleteConfirmText(''); setDeleteError(''); setShowDeleteModal(true); }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors border bg-red-950/60 hover:bg-red-950/90 text-red-400 border-red-800"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar cuenta
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="text-base font-semibold text-red-400">Eliminar cuenta definitivamente</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-950/40 border border-red-800 rounded-lg p-3 text-sm text-red-300 space-y-1">
                <p className="font-semibold">⚠ Esta acción no tiene vuelta atrás.</p>
                <p>Se eliminarán permanentemente todos los datos de <span className="font-semibold text-white">{cliente.nombre}</span>: productos, ventas, compras, usuarios, sucursales, configuración y suscripción.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Para confirmar, escribí el nombre de la empresa: <span className="text-white font-medium">{cliente.nombre}</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder={cliente.nombre}
                />
              </div>
              {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  disabled={deleteConfirmText !== cliente.nombre || deleteLoading}
                  onClick={async () => {
                    setDeleteLoading(true);
                    setDeleteError('');
                    try {
                      await onDelete(clienteId);
                    } catch (err) {
                      const detail = err.response?.data?.detail;
                      setDeleteError(typeof detail === 'string' ? detail : 'Error al eliminar la cuenta');
                      setDeleteLoading(false);
                    }
                  }}
                  className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-2 rounded-lg transition-colors"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos del Cliente</h3>
            {!editingDatos && (
              <button
                onClick={handleEditDatos}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
          {editingDatos ? (
            <form onSubmit={handleSaveDatos} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre empresa</label>
                <input
                  type="text"
                  value={datosForm.empresa_nombre}
                  onChange={e => setDatosForm(f => ({ ...f, empresa_nombre: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre administrador</label>
                <input
                  type="text"
                  value={datosForm.admin_nombre}
                  onChange={e => setDatosForm(f => ({ ...f, admin_nombre: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email administrador</label>
                <input
                  type="email"
                  value={datosForm.admin_email}
                  onChange={e => setDatosForm(f => ({ ...f, admin_email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              {datosMsg && (
                <p className={`text-xs ${datosMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{datosMsg.text}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={datosLoading}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm py-1.5 rounded-lg transition-colors"
                >
                  {datosLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingDatos(false); setDatosMsg(null); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-1.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
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
              {datosMsg && (
                <p className={`text-xs ${datosMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{datosMsg.text}</p>
              )}
            </dl>
          )}
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
              {sus.dia_facturacion && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Día de facturación</dt>
                  <dd className="text-sm text-gray-200">Día {sus.dia_facturacion} de cada mes</dd>
                </div>
              )}
              {/* Débito automático */}
              <div className="pt-2 mt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sus.tipo_cobro === 'automatico' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <ZapOff className="w-4 h-4 text-gray-600" />
                    )}
                    <dt className="text-sm text-gray-500">Débito automático</dt>
                  </div>
                  <dd className={`text-sm font-medium ${sus.tipo_cobro === 'automatico' ? 'text-green-400' : sus.tipo_cobro === 'pendiente_autorizacion' ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {sus.tipo_cobro === 'automatico' ? 'Activo' : sus.tipo_cobro === 'pendiente_autorizacion' ? 'Pendiente auth.' : 'Inactivo'}
                  </dd>
                </div>
                {sus.mp_preapproval_id && (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-mono truncate max-w-[180px]">{sus.mp_preapproval_id}</p>
                    <button
                      onClick={cancelarPreapproval}
                      disabled={cancelandoPreapproval}
                      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 flex items-center gap-1 ml-2 shrink-0"
                    >
                      {cancelandoPreapproval ? 'Cancelando...' : '✕ Cancelar'}
                    </button>
                  </div>
                )}
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
        {sortedClientePagos?.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th onClick={() => pagosRequestSort('fecha')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Fecha <SortIcon columnKey="fecha" sortConfig={pagosSortConfig} dark /></th>
                  <th onClick={() => pagosRequestSort('concepto')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Concepto <SortIcon columnKey="concepto" sortConfig={pagosSortConfig} dark /></th>
                  <th onClick={() => pagosRequestSort('monto')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Monto <SortIcon columnKey="monto" sortConfig={pagosSortConfig} dark /></th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Tipo</th>
                  <th onClick={() => pagosRequestSort('estado')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Estado <SortIcon columnKey="estado" sortConfig={pagosSortConfig} dark /></th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Período</th>
                </tr>
              </thead>
              <tbody>
                {sortedClientePagos.map(p => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td data-label="Fecha" className="py-3 px-2 text-gray-400">{formatDate(p.fecha)}</td>
                    <td data-mobile="title" className="py-3 px-2 text-gray-200">{p.concepto}</td>
                    <td data-label="Monto" className="py-3 px-2 text-emerald-400 font-semibold">{formatMoney(p.monto)}</td>
                    <td data-label="Tipo" className="py-3 px-2 text-gray-400 text-xs capitalize">{p.plan_tipo || '—'}</td>
                    <td data-label="Estado" className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estado === 'approved' ? 'bg-green-900/40 text-green-300' :
                        p.estado === 'pending'  ? 'bg-yellow-900/40 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {p.estado === 'approved' ? 'Aprobado' : p.estado === 'pending' ? 'Pendiente' : p.estado}
                      </span>
                    </td>
                    <td data-label="Período" className="py-3 px-2 text-gray-500 text-xs">
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

      {/* Panel de Módulos */}
      <ModulosPanel
        cliente={cliente}
        updatingModulos={updatingModulos}
        moduleMsg={moduleMsg}
        onToggleModulo={toggleModulo}
        onChangePlanTier={changePlanTier}
      />

      {/* Configuración de cuenta */}
      <EmpresaConfigPanel empresaId={clienteId} token={token} />

      {/* Modal: Confirmar impersonación */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-900/50 border border-orange-700 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ingresar como Administrador</h3>
                <p className="text-xs text-gray-500">Acceso a la cuenta del cliente</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-6">
              Vas a ingresar al sistema como el administrador de{' '}
              <span className="font-semibold text-white">{cliente.nombre}</span>.
              Un banner naranja indicará que estás en modo impersonación.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImpersonateModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImpersonate}
                className="flex-1 py-2.5 rounded-lg bg-orange-700 hover:bg-orange-600 text-white font-medium transition-colors text-sm"
              >
                Ingresar
              </button>
            </div>
          </div>
        </div>
      )}

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

// ─── CobrosView ───────────────────────────────────────────────────────────────

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

  const preFiltered = pagos.filter(p => {
    const matchSearch = !search ||
      (p.empresa_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.concepto || '').toLowerCase().includes(search.toLowerCase());
    const matchMes = !filterMes || (p.fecha && new Date(p.fecha).toISOString().startsWith(filterMes));
    return matchSearch && matchMes;
  });

  const { sortedItems: filtered, sortConfig: cobrosSortConfig, requestSort: cobrosRequestSort } = useSortableData(preFiltered);

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
                  <th onClick={() => cobrosRequestSort('fecha')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Fecha <SortIcon columnKey="fecha" sortConfig={cobrosSortConfig} dark /></th>
                  <th onClick={() => cobrosRequestSort('empresa_nombre')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Empresa <SortIcon columnKey="empresa_nombre" sortConfig={cobrosSortConfig} dark /></th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Concepto</th>
                  <th onClick={() => cobrosRequestSort('monto')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Monto <SortIcon columnKey="monto" sortConfig={cobrosSortConfig} dark /></th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Tipo</th>
                  <th className="text-left py-2 px-2 text-gray-600 font-medium">Origen</th>
                  <th onClick={() => cobrosRequestSort('estado')} className="text-left py-2 px-2 text-gray-600 font-medium cursor-pointer select-none hover:bg-gray-800/50">Estado <SortIcon columnKey="estado" sortConfig={cobrosSortConfig} dark /></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td data-label="Fecha" className="py-3 px-2 text-gray-400">{formatDate(p.fecha)}</td>
                    <td data-mobile="title" className="py-3 px-2 text-white font-medium">{p.empresa_nombre}</td>
                    <td data-label="Concepto" className="py-3 px-2 text-gray-300">{p.concepto}</td>
                    <td data-label="Monto" className="py-3 px-2 text-emerald-400 font-semibold">{formatMoney(p.monto)}</td>
                    <td data-label="Tipo" className="py-3 px-2 text-gray-400 text-xs capitalize">{p.plan_tipo || '—'}</td>
                    <td data-label="Origen" className="py-3 px-2">
                      {p.origen === 'preapproval' ? (
                        <span className="flex items-center gap-1 text-xs text-indigo-400">
                          <Zap className="w-3 h-3" /> Auto
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">Manual</span>
                      )}
                    </td>
                    <td data-label="Estado" className="py-3 px-2">
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

// ─── ConfigView ───────────────────────────────────────────────────────────────

const ConfigSection = ({ title, children }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
    <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-5">{title}</h3>
    <div className="space-y-5">{children}</div>
  </div>
);

const ConfigField = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const inputDisabledCls = "w-full bg-gray-800/40 border border-gray-800 text-gray-500 rounded-lg px-4 py-2.5 cursor-not-allowed";

const ConfigView = ({ token }) => {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [cfg, setCfg] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    ownerAxios.get('/config', authHeader).then(res => {
      setCfg({
        suscripcion_precio: String(res.data.suscripcion_precio ?? ''),
        suscripcion_plan_nombre: res.data.suscripcion_plan_nombre ?? '',
        precio_emprendedor: String(res.data.precio_emprendedor ?? 30000),
        precio_profesional: String(res.data.precio_profesional ?? 45000),
        precio_empresarial: String(res.data.precio_empresarial ?? 60000),
        precio_tienda: String(res.data.precio_tienda ?? 0),
        precio_sucursal_extra: String(res.data.precio_sucursal_extra ?? 0),
        precio_pack_usuarios: String(res.data.precio_pack_usuarios ?? 0),
        whatsapp_numero: res.data.whatsapp_numero ?? '',
        trial_dias: String(res.data.trial_dias ?? 15),
        descuento_anual_pct: String(res.data.descuento_anual_pct ?? 20),
        grace_days: String(res.data.grace_days ?? 15),
        dias_alerta_1: String((res.data.dias_alerta ?? [10, 5])[0] ?? 10),
        dias_alerta_2: String((res.data.dias_alerta ?? [10, 5])[1] ?? 5),
        saas_nombre: res.data.saas_nombre ?? 'PULS',
        statement_descriptor: res.data.statement_descriptor ?? 'SuperMarket POS',
        smtp_host: res.data.smtp_host ?? '',
        smtp_port: String(res.data.smtp_port ?? 587),
        smtp_user: res.data.smtp_user ?? '',
        smtp_password: res.data.smtp_password ?? '',
        smtp_from: res.data.smtp_from ?? '',
      });
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const set = (field) => (e) => setCfg(prev => ({ ...prev, [field]: e.target.value }));

  const precioAnual = cfg.suscripcion_precio
    ? Math.round(parseFloat(cfg.suscripcion_precio) * 12 * (1 - (parseFloat(cfg.descuento_anual_pct) || 20) / 100))
    : 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const diasAlerta = [
        parseInt(cfg.dias_alerta_1) || 10,
        parseInt(cfg.dias_alerta_2) || 5,
      ].sort((a, b) => b - a);
      await ownerAxios.put('/config', {
        suscripcion_precio: parseFloat(cfg.suscripcion_precio),
        suscripcion_plan_nombre: cfg.suscripcion_plan_nombre,
        precio_emprendedor: parseFloat(cfg.precio_emprendedor),
        precio_profesional: parseFloat(cfg.precio_profesional),
        precio_empresarial: parseFloat(cfg.precio_empresarial),
        precio_tienda: parseFloat(cfg.precio_tienda) || 0,
        precio_sucursal_extra: parseFloat(cfg.precio_sucursal_extra) || 0,
        precio_pack_usuarios: parseFloat(cfg.precio_pack_usuarios) || 0,
        whatsapp_numero: cfg.whatsapp_numero,
        trial_dias: parseInt(cfg.trial_dias),
        descuento_anual_pct: parseInt(cfg.descuento_anual_pct),
        grace_days: parseInt(cfg.grace_days),
        dias_alerta: diasAlerta,
        saas_nombre: cfg.saas_nombre,
        statement_descriptor: cfg.statement_descriptor,
        smtp_host: cfg.smtp_host || null,
        smtp_port: cfg.smtp_port ? parseInt(cfg.smtp_port) : null,
        smtp_user: cfg.smtp_user || null,
        smtp_password: cfg.smtp_password || null,
        smtp_from: cfg.smtp_from || null,
      }, authHeader);
      setMsg({ ok: true, text: 'Configuración guardada.' });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.detail || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-6">Configuración del Sistema</h2>
      <form onSubmit={handleSave} className="max-w-lg">

        <ConfigSection title="Identidad">
          <ConfigField label="Nombre del SaaS" hint="Se muestra en emails de verificación y recuperación de contraseña.">
            <input type="text" value={cfg.saas_nombre} onChange={set('saas_nombre')} className={inputCls} required />
          </ConfigField>
          <ConfigField label="WhatsApp de contacto / pagos" hint="Formato internacional, ej: +5493815156095. Se muestra en la página de Cuenta.">
            <input type="text" value={cfg.whatsapp_numero} onChange={set('whatsapp_numero')} placeholder="+5493811234567" className={inputCls} />
          </ConfigField>
        </ConfigSection>

        <ConfigSection title="Suscripciones y Precios">
          <ConfigField label="Nombre del plan">
            <input type="text" value={cfg.suscripcion_plan_nombre} onChange={set('suscripcion_plan_nombre')} className={inputCls} required />
          </ConfigField>
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Precio mensual por tier (ARS)</p>
            <div className="grid grid-cols-3 gap-3">
              <ConfigField label="Emprendedor">
                <input type="number" value={cfg.precio_emprendedor} onChange={set('precio_emprendedor')} className={inputCls} min="0" required />
              </ConfigField>
              <ConfigField label="Profesional">
                <input type="number" value={cfg.precio_profesional} onChange={set('precio_profesional')} className={inputCls} min="0" required />
              </ConfigField>
              <ConfigField label="Empresarial">
                <input type="number" value={cfg.precio_empresarial} onChange={set('precio_empresarial')} className={inputCls} min="0" required />
              </ConfigField>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">El precio anual se calcula automáticamente como precio × 11 (1 mes gratis).</p>
          </div>
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Precio mensual de add-ons (ARS)</p>
            <div className="grid grid-cols-3 gap-3">
              <ConfigField label="Tienda Online" hint="Precio mensual del add-on Tienda para cualquier plan.">
                <input type="number" value={cfg.precio_tienda} onChange={set('precio_tienda')} className={inputCls} min="0" />
              </ConfigField>
              <ConfigField label="Sucursal extra" hint="Precio por cada sucursal adicional sobre las 3 base del plan Empresarial.">
                <input type="number" value={cfg.precio_sucursal_extra} onChange={set('precio_sucursal_extra')} className={inputCls} min="0" />
              </ConfigField>
              <ConfigField label="Pack 5 usuarios" hint="Precio por cada pack de 5 usuarios adicionales sobre los 15 base del plan Empresarial.">
                <input type="number" value={cfg.precio_pack_usuarios} onChange={set('precio_pack_usuarios')} className={inputCls} min="0" />
              </ConfigField>
            </div>
          </div>
          <ConfigField label="Días del período de prueba (trial)" hint="Días de acceso gratuito al registrar una empresa nueva.">
            <input type="number" value={cfg.trial_dias} onChange={set('trial_dias')} className={inputCls} min="1" max="365" required />
          </ConfigField>
        </ConfigSection>

        <ConfigSection title="Vencimientos">
          <ConfigField label="Período de gracia (días)" hint="Días extra de acceso para suscripciones pagas vencidas, antes de bloquear.">
            <input type="number" value={cfg.grace_days} onChange={set('grace_days')} className={inputCls} min="0" max="90" required />
          </ConfigField>
          <ConfigField label="Umbral de alerta 1 (días)" hint="Se genera notificación cuando faltan este número de días o menos para vencer.">
            <input type="number" value={cfg.dias_alerta_1} onChange={set('dias_alerta_1')} className={inputCls} min="1" max="60" required />
          </ConfigField>
          <ConfigField label="Umbral de alerta 2 (días)" hint="Segundo umbral, más urgente. Debe ser menor que el primero.">
            <input type="number" value={cfg.dias_alerta_2} onChange={set('dias_alerta_2')} className={inputCls} min="1" max="60" required />
          </ConfigField>
        </ConfigSection>

        <ConfigSection title="MercadoPago">
          <ConfigField label="Statement descriptor" hint="Texto que aparece en el resumen de tarjeta del cliente al pagar.">
            <input type="text" value={cfg.statement_descriptor} onChange={set('statement_descriptor')} className={inputCls} maxLength={22} />
          </ConfigField>
        </ConfigSection>

        <ConfigSection title="Email / SMTP">
          <div className="grid grid-cols-2 gap-4">
            <ConfigField label="Host SMTP">
              <input type="text" value={cfg.smtp_host} onChange={set('smtp_host')} placeholder="smtp.gmail.com" className={inputCls} />
            </ConfigField>
            <ConfigField label="Puerto">
              <input type="number" value={cfg.smtp_port} onChange={set('smtp_port')} placeholder="587" className={inputCls} />
            </ConfigField>
          </div>
          <ConfigField label="Usuario (email de envío)">
            <input type="email" value={cfg.smtp_user} onChange={set('smtp_user')} placeholder="notificaciones@miapp.com" className={inputCls} />
          </ConfigField>
          <ConfigField label="Contraseña / App Password">
            <input type="password" value={cfg.smtp_password} onChange={set('smtp_password')} placeholder="••••••••••••" className={inputCls} autoComplete="new-password" />
          </ConfigField>
          <ConfigField label="Nombre remitente (From)" hint='Ej: "Mi App <notificaciones@miapp.com>"'>
            <input type="text" value={cfg.smtp_from} onChange={set('smtp_from')} placeholder="PULS <noreply@miapp.com>" className={inputCls} />
          </ConfigField>
        </ConfigSection>

        {msg && (
          <p className={`text-sm mb-4 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
};

// ─── EmpresaConfigPanel ───────────────────────────────────────────────────────

const EmpresaConfigPanel = ({ empresaId, token }) => {
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadConfig = async () => {
    setLoadError(null);
    try {
      const res = await ownerAxios.get(`/clientes/${empresaId}/config`, authHeader);
      const d = res.data;
      setCfg({
        company_name: d.company_name ?? '',
        company_address: d.company_address ?? '',
        company_phone: d.company_phone ?? '',
        company_email: d.company_email ?? '',
        company_tax_id: d.company_tax_id ?? '',
        tax_rate: String(d.tax_rate != null ? Math.round(d.tax_rate * 100) : 12),
        currency_symbol: d.currency_symbol ?? '$',
        currency_code: d.currency_code ?? 'ARS',
        sounds_enabled: d.sounds_enabled ?? true,
        auto_focus_barcode: d.auto_focus_barcode ?? true,
        barcode_scan_timeout: String(d.barcode_scan_timeout ?? 100),
        receipt_footer_text: d.receipt_footer_text ?? '',
        default_minimum_stock: String(d.default_minimum_stock ?? 10),
        low_stock_alert_enabled: d.low_stock_alert_enabled ?? true,
        auto_update_inventory: d.auto_update_inventory ?? true,
        print_receipt_auto: d.print_receipt_auto ?? false,
        show_receipt_after_sale: d.show_receipt_after_sale ?? true,
        receipt_width: String(d.receipt_width ?? 80),
        items_per_page: String(d.items_per_page ?? 10),
        date_format: d.date_format ?? 'DD/MM/YYYY',
        time_format: d.time_format ?? '24h',
        pay_efectivo: String(d.payment_method_adjustments?.efectivo ?? 0),
        pay_tarjeta: String(d.payment_method_adjustments?.tarjeta ?? 0),
        pay_transferencia: String(d.payment_method_adjustments?.transferencia ?? 0),
      });
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.detail || 'Error al cargar la configuración');
    }
  };

  const handleToggle = () => {
    if (!open && !cfg) loadConfig();
    setOpen(o => !o);
    setMsg(null);
  };

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setCfg(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const taxRate = parseFloat(cfg.tax_rate) / 100;
      await ownerAxios.put(`/clientes/${empresaId}/config`, {
        company_name: cfg.company_name || null,
        company_address: cfg.company_address || null,
        company_phone: cfg.company_phone || null,
        company_email: cfg.company_email || null,
        company_tax_id: cfg.company_tax_id || null,
        tax_rate: isNaN(taxRate) ? null : taxRate,
        currency_symbol: cfg.currency_symbol || null,
        currency_code: cfg.currency_code || null,
        sounds_enabled: cfg.sounds_enabled,
        auto_focus_barcode: cfg.auto_focus_barcode,
        barcode_scan_timeout: parseInt(cfg.barcode_scan_timeout) || null,
        receipt_footer_text: cfg.receipt_footer_text || null,
        default_minimum_stock: parseInt(cfg.default_minimum_stock) || null,
        low_stock_alert_enabled: cfg.low_stock_alert_enabled,
        auto_update_inventory: cfg.auto_update_inventory,
        print_receipt_auto: cfg.print_receipt_auto,
        show_receipt_after_sale: cfg.show_receipt_after_sale,
        receipt_width: parseInt(cfg.receipt_width) || null,
        items_per_page: parseInt(cfg.items_per_page) || null,
        date_format: cfg.date_format || null,
        time_format: cfg.time_format || null,
        payment_method_adjustments: {
          efectivo: parseFloat(cfg.pay_efectivo) || 0,
          tarjeta: parseFloat(cfg.pay_tarjeta) || 0,
          transferencia: parseFloat(cfg.pay_transferencia) || 0,
        },
      }, authHeader);
      setMsg({ ok: true, text: 'Configuración guardada.' });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.detail || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ field, label }) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-400">{label}</span>
      <div
        onClick={() => setCfg(prev => ({ ...prev, [field]: !prev[field] }))}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg[field] ? 'bg-indigo-600' : 'bg-gray-700'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg[field] ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
    </label>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-5">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-300">Configuración de cuenta</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-800 p-5">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-red-400 text-sm">{loadError}</p>
              <button
                onClick={loadConfig}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Reintentar
              </button>
            </div>
          ) : !cfg ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">

              {/* Empresa */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Datos de la empresa</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                      <input type="text" value={cfg.company_name} onChange={set('company_name')} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">CUIT / Tax ID</label>
                      <input type="text" value={cfg.company_tax_id} onChange={set('company_tax_id')} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                    <input type="text" value={cfg.company_address} onChange={set('company_address')} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                      <input type="text" value={cfg.company_phone} onChange={set('company_phone')} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email empresa</label>
                      <input type="email" value={cfg.company_email} onChange={set('company_email')} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Impuestos y Moneda */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Impuestos y Moneda</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">IVA (%)</label>
                    <input type="number" value={cfg.tax_rate} onChange={set('tax_rate')} className={inputCls} min="0" max="100" step="0.1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Símbolo moneda</label>
                    <input type="text" value={cfg.currency_symbol} onChange={set('currency_symbol')} className={inputCls} maxLength={4} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Código moneda</label>
                    <input type="text" value={cfg.currency_code} onChange={set('currency_code')} className={inputCls} maxLength={4} />
                  </div>
                </div>
              </div>

              {/* POS */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">POS</p>
                <div className="space-y-3">
                  <Toggle field="sounds_enabled" label="Sonidos habilitados" />
                  <Toggle field="auto_focus_barcode" label="Auto-foco en lector de código" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Timeout lector de barcode (ms)</label>
                    <input type="number" value={cfg.barcode_scan_timeout} onChange={set('barcode_scan_timeout')} className={inputCls} min="50" max="2000" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pie de recibo</label>
                    <input type="text" value={cfg.receipt_footer_text} onChange={set('receipt_footer_text')} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Recibo */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Recibo</p>
                <div className="space-y-3">
                  <Toggle field="print_receipt_auto" label="Imprimir recibo automáticamente" />
                  <Toggle field="show_receipt_after_sale" label="Mostrar recibo tras la venta" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ancho recibo (caracteres)</label>
                    <input type="number" value={cfg.receipt_width} onChange={set('receipt_width')} className={inputCls} min="40" max="120" />
                  </div>
                </div>
              </div>

              {/* Inventario */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Inventario</p>
                <div className="space-y-3">
                  <Toggle field="low_stock_alert_enabled" label="Alertas de stock bajo habilitadas" />
                  <Toggle field="auto_update_inventory" label="Actualización automática de inventario" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Stock mínimo por defecto</label>
                    <input type="number" value={cfg.default_minimum_stock} onChange={set('default_minimum_stock')} className={inputCls} min="0" />
                  </div>
                </div>
              </div>

              {/* Sistema */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Sistema</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ítems por página</label>
                    <input type="number" value={cfg.items_per_page} onChange={set('items_per_page')} className={inputCls} min="5" max="100" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Formato fecha</label>
                    <select value={cfg.date_format} onChange={set('date_format')} className={inputCls}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Formato hora</label>
                    <select value={cfg.time_format} onChange={set('time_format')} className={inputCls}>
                      <option value="24h">24h</option>
                      <option value="12h">12h (AM/PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ajustes por método de pago */}
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Ajustes por método de pago (%)</p>
                <p className="text-xs text-gray-600 mb-4">Negativo = descuento. Positivo = recargo. Ej: -3 = 3% descuento en efectivo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Efectivo</label>
                    <input type="number" value={cfg.pay_efectivo} onChange={set('pay_efectivo')} className={inputCls} step="0.1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tarjeta</label>
                    <input type="number" value={cfg.pay_tarjeta} onChange={set('pay_tarjeta')} className={inputCls} step="0.1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transferencia</label>
                    <input type="number" value={cfg.pay_transferencia} onChange={set('pay_transferencia')} className={inputCls} step="0.1" />
                  </div>
                </div>
              </div>

              {msg && (
                <p className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar configuración de cuenta'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// ─── AlertasView ──────────────────────────────────────────────────────────────

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

// ─── OwnerPanelView ───────────────────────────────────────────────────────────

const OwnerPanelView = ({
  token,
  view,
  setView,
  selectedClienteId,
  setSelectedClienteId,
  stats,
  clientes,
  loadingData,
  urgentCount,
  isClienteView,
  handleLogin,
  handleLogout,
  loadStats,
  loadClientes,
  selectCliente,
  createCliente,
  deleteCliente,
}) => {
  if (!token) return <LoginView onLogin={handleLogin} />;

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
            onCreateCliente={createCliente}
          />
        ) : view === 'cliente_detalle' && selectedClienteId ? (
          <ClienteDetalleView
            clienteId={selectedClienteId}
            token={token}
            onBack={() => { setView('clientes'); setSelectedClienteId(null); }}
            onDelete={deleteCliente}
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

export default OwnerPanelView;
