import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Error al cargar estadísticas');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  const getRoleBasedWelcome = () => {
    switch (user?.rol) {
      case 'admin':
        return 'Panel de Administración';
      case 'supervisor':
        return 'Panel de Supervisión';
      case 'cajero':
        return 'Sistema de Punto de Venta';
      default:
        return 'Dashboard';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (['admin', 'cajero', 'supervisor'].includes(user?.rol)) {
      actions.push({
        title: 'Realizar Venta',
        description: 'Ir al punto de venta',
        href: '/pos',
        icon: ShoppingBag,
        color: 'bg-green-500'
      });
    }

    if (user?.rol === 'admin') {
      actions.push({
        title: 'Gestionar Productos',
        description: 'Administrar inventario',
        href: '/products',
        icon: Package,
        color: 'bg-blue-500'
      });
    }

    if (['admin', 'supervisor'].includes(user?.rol)) {
      actions.push({
        title: 'Ver Reportes',
        description: 'Análisis de ventas',
        href: '/sales',
        icon: TrendingUp,
        color: 'bg-purple-500'
      });
    }

    if (user?.rol === 'admin') {
      actions.push({
        title: 'Gestionar Usuarios',
        description: 'Administrar empleados',
        href: '/users',
        icon: Users,
        color: 'bg-orange-500'
      });
    }

    return actions;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {user?.nombre}!
        </h1>
        <p className="text-gray-600">{getRoleBasedWelcome()}</p>
      </div>

      {/* Stats Cards - Solo para admin y supervisor */}
      {stats && ['admin', 'supervisor'].includes(user?.rol) && (
        <div className="dashboard-grid fade-in">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-title">Ventas de Hoy</div>
              <div className="stat-icon">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="stat-value">
              ${stats.ventas_hoy.total.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.ventas_hoy.cantidad} transacciones
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-title">Total Productos</div>
              <div className="stat-icon">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <div className="stat-value">{stats.productos.total}</div>
            <p className="text-sm text-gray-500 mt-2">
              Productos activos
            </p>
          </div>

          <div className="stat-card border-left-color: #ef4444;">
            <div className="stat-header">
              <div className="stat-title">Stock Bajo</div>
              <div className="stat-icon bg-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="stat-value text-red-600">
              {stats.productos.bajo_stock}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Requieren atención
            </p>
          </div>
        </div>
      )}

      {/* Low Stock Alert - Solo para admin */}
      {stats?.productos_bajo_stock?.length > 0 && user?.rol === 'admin' && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Productos con Stock Bajo
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {stats.productos_bajo_stock.slice(0, 5).map(product => (
                    <li key={product.id}>
                      {product.nombre}: {product.stock} unidades (mín: {product.stock_minimo})
                    </li>
                  ))}
                </ul>
                {stats.productos_bajo_stock.length > 5 && (
                  <p className="mt-2 font-medium">
                    Y {stats.productos_bajo_stock.length - 5} productos más...
                  </p>
                )}
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
          {getQuickActions().map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="group block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center">
                <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6" />
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
          ))}
        </div>
      </div>

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

export default Dashboard;