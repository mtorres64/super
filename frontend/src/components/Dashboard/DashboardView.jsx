import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  Truck,
  ClipboardList,
  Bell,
  CheckCircle2,
  Circle,
  X,
  ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const ICON_MAP = {
  ShoppingBag,
  ClipboardList,
  Package,
  TrendingUp,
  Truck,
  Building2,
  Users,
};

const OnboardingChecklist = ({ stats, empresaId }) => {
  const storageKey = `onboarding_dismissed_${empresaId}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === '1');

  const ob = stats?.onboarding;
  const steps = [
    { label: 'Empresa registrada', done: true, href: null },
    { label: 'Sucursal principal creada', done: (ob?.sucursales ?? 0) > 0, href: '/branches', hint: 'Editá el nombre y dirección' },
    { label: 'Categorías de productos listas', done: (ob?.categorias ?? 0) > 0, href: '/products', hint: 'Podés agregar más cuando quieras' },
    { label: 'Agregá tu primer producto', done: (ob?.productos ?? 0) > 0, href: '/products', hint: 'Necesario para empezar a vender' },
    { label: 'Personalizá tu empresa', done: false, href: '/settings', hint: 'Logo, colores y datos fiscales', optional: true },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allRequiredDone = steps.filter(s => !s.optional).every(s => s.done);

  if (dismissed || allRequiredDone) return null;

  return (
    <div className="mb-8 bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
            {completedCount}/{steps.length}
          </div>
          <div>
            <h2 className="font-semibold text-green-900 text-sm">Primeros pasos</h2>
            <p className="text-green-700 text-xs">Completá la configuración inicial para empezar a vender</p>
          </div>
        </div>
        <button
          onClick={() => { localStorage.setItem(storageKey, '1'); setDismissed(true); }}
          className="text-green-400 hover:text-green-600 transition-colors p-1"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {steps.map((step, i) => (
          <li key={i}>
            {step.href && !step.done ? (
              <Link to={step.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">{step.label}</span>
                  {step.hint && <p className="text-xs text-gray-400">{step.hint}{step.optional ? ' · Opcional' : ''}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors flex-shrink-0" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${step.done ? 'text-green-500' : 'text-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step.label}</span>
                  {step.href && step.done && step.hint && (
                    <p className="text-xs text-gray-300">{step.hint}</p>
                  )}
                </div>
                {step.href && step.done && (
                  <Link to={step.href} className="text-xs text-gray-300 hover:text-green-500 transition-colors flex-shrink-0">Editar</Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const DashboardView = ({
  loading,
  stats,
  user,
  noLeidas,
  ventasDiarias,
  diasGrafico,
  setDiasGrafico,
  branches,
  branchFiltro,
  setBranchFiltro,
  primaryColor,
  getRoleBasedWelcome,
  getQuickActions,
  showStats,
  showLowStockAlert,
  formatAmount,
}) => {
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  const quickActions = getQuickActions();

  return (
    <div className="p-6 flex flex-col" style={{ minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {user?.nombre}!
        </h1>
        <p className="text-gray-600">{getRoleBasedWelcome()}</p>
      </div>

      {/* Onboarding checklist - Solo para admin */}
      {user?.rol === 'admin' && stats && (
        <OnboardingChecklist stats={stats} empresaId={user.empresa_id} />
      )}

      {/* Stats Cards - Solo para admin y supervisor */}
      {showStats && (
        <div className="dashboard-grid fade-in">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-title">Ventas de Hoy</div>
              <div className="stat-icon">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="stat-value">
              ${formatAmount(stats.ventas_hoy.total)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.ventas_hoy.cantidad} transacciones
            </p>
          </div>

          <Link to="/stock-alerts" className={`stat-card border-l-4 hover:shadow-md transition-shadow cursor-pointer ${stats.productos.bajo_stock > 0 ? 'border-red-400' : 'border-gray-200'}`}>
            <div className="stat-header">
              <div className="stat-title">Stock Bajo</div>
              <div className={`stat-icon ${stats.productos.bajo_stock > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className={`stat-value ${stats.productos.bajo_stock > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {stats.productos.bajo_stock}
            </div>
            <p className={`text-sm mt-2 font-medium ${stats.productos.bajo_stock > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {stats.productos.bajo_stock > 0 ? 'Requieren atención · Ver detalle →' : 'Sin alertas · Ver detalle →'}
            </p>
          </Link>

          <Link to="/notificaciones" className="stat-card border-l-4 border-indigo-400 hover:shadow-md transition-shadow cursor-pointer">
            <div className="stat-header">
              <div className="stat-title">Notificaciones</div>
              <div className={`stat-icon ${noLeidas > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                <Bell className="w-6 h-6" />
              </div>
            </div>
            <div className={`stat-value ${noLeidas > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
              {noLeidas}
            </div>
            <p className={`text-sm mt-2 font-medium ${noLeidas > 0 ? 'text-indigo-500' : 'text-gray-400'}`}>
              {noLeidas > 0 ? 'Sin leer · Ver todas →' : 'Al día'}
            </p>
          </Link>
        </div>
      )}

      {/* Low Stock Alert - Para admin, supervisor y cajero */}
      {showLowStockAlert && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Productos con Stock Bajo
                {user?.rol === 'admin' && ' (todas las sucursales)'}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {stats.productos_bajo_stock.map((product, idx) => (
                    <li key={product.id || idx}>
                      <span className="font-medium">{product.nombre}</span>
                      {product.sucursal && (
                        <span className="text-red-500"> — {product.sucursal}</span>
                      )}
                      : {product.stock} unidades (mín: {product.stock_minimo})
                    </li>
                  ))}
                </ul>
                {stats.productos.bajo_stock > stats.productos_bajo_stock.length && (
                  <p className="mt-2 font-medium">
                    Y {stats.productos.bajo_stock - stats.productos_bajo_stock.length} productos más...
                  </p>
                )}
              </div>
              <div className="mt-3">
                <Link
                  to="/stock-alerts"
                  className="text-sm font-medium text-red-700 underline hover:text-red-900"
                >
                  Ver lista completa →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const IconComponent = ICON_MAP[action.icon];
            return (
              <Link
                key={index}
                to={action.href}
                className="group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex items-center">
                  <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    {IconComponent && <IconComponent className="w-6 h-6" />}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Gráfico ventas diarias - Solo admin y supervisor */}
      {['admin', 'supervisor'].includes(user?.rol) && (
        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col" style={{ minHeight: 280 }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Ventas por día</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {branches.length > 1 && (
                <select
                  value={branchFiltro || 'todas'}
                  onChange={e => setBranchFiltro(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1"
                  style={{ focusRingColor: primaryColor }}
                >
                  <option value="todas">Todas las sucursales</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                {[30, 60].map(d => (
                  <button
                    key={d}
                    onClick={() => setDiasGrafico(d)}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${diasGrafico === d ? 'text-white' : 'text-gray-500 border-gray-200'}`}
                    style={diasGrafico === d ? { background: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%" style={{ flex: 1, minHeight: 200 }}>
            <BarChart data={ventasDiarias} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => {
                  const [, m, d] = v.split('-');
                  return `${d}/${m}`;
                }}
                interval={Math.floor(ventasDiarias.length / 8)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => v === 0 ? '0' : `$${(v / 1000).toFixed(0)}k`}
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`$${formatAmount(value)}`, 'Ventas']}
                labelFormatter={label => {
                  const [y, m, d] = label.split('-');
                  return `${d}/${m}/${y}`;
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="total" fill={primaryColor} radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity for Cajeros */}
      {user?.rol === 'cajero' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Información del Sistema
          </h2>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <ShoppingBag className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <h3 className="font-medium text-green-900">Punto de Venta Activo</h3>
                <p className="text-green-700">Sistema listo para procesar ventas</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Instrucciones:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Usar el escáner o buscar productos manualmente</li>
                <li>• Agregar productos al carrito</li>
                <li>• Seleccionar método de pago</li>
                <li>• Procesar la venta</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
