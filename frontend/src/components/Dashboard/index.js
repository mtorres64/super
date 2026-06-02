import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { formatAmount } from '../../lib/utils';
import { toast } from 'sonner';
import DashboardView from './DashboardView';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);
  const [ventasDiarias, setVentasDiarias] = useState([]);
  const [diasGrafico, setDiasGrafico] = useState(30);
  const [branches, setBranches] = useState([]);
  const [branchFiltro, setBranchFiltro] = useState(null); // null = se inicializa con la del usuario
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(true);
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#16a34a';
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchDashboardStats();
    axios.get(`${API}/config`)
      .then(res => setLowStockAlertEnabled(res.data.low_stock_alert_enabled !== false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (['admin', 'supervisor'].includes(user?.rol)) {
      axios.get(`${API}/branches`)
        .then(res => {
          setBranches(res.data);
          // Default: la sucursal del usuario, o "todas" si es admin sin sucursal asignada
          if (branchFiltro === null) {
            setBranchFiltro(user?.branch_id || 'todas');
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (['admin', 'supervisor'].includes(user?.rol) && branchFiltro !== null) {
      const params = new URLSearchParams({ dias: diasGrafico });
      if (branchFiltro !== 'todas') params.append('branch_id', branchFiltro);
      axios.get(`${API}/dashboard/ventas-diarias?${params}`)
        .then(res => setVentasDiarias(res.data))
        .catch(() => {});
    }
  }, [user, diasGrafico, branchFiltro]);

  useEffect(() => {
    if (user?.rol === 'admin') {
      axios.get(`${API}/notificaciones/count`)
        .then(res => setNoLeidas(res.data.no_leidas))
        .catch(() => {});
    }
  }, [user]);

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
        icon: 'ShoppingBag',
        color: 'bg-green-500'
      });
      actions.push({
        title: 'Historial de Ventas',
        description: 'Ver y reimprimir tickets',
        href: '/sales',
        icon: 'ClipboardList',
        color: 'bg-indigo-500'
      });
    }

    if (user?.rol === 'admin') {
      actions.push({
        title: 'Gestionar Productos',
        description: 'Administrar inventario',
        href: '/products',
        icon: 'Package',
        color: 'bg-blue-500'
      });
    }

    if (['admin', 'supervisor'].includes(user?.rol)) {
      actions.push({
        title: 'Ver Reportes',
        description: 'Análisis de ventas y compras',
        href: '/reports',
        icon: 'TrendingUp',
        color: 'bg-purple-500'
      });
    }

    if (['admin', 'supervisor'].includes(user?.rol)) {
      actions.push({
        title: 'Compras',
        description: 'Facturas y proveedores',
        href: '/compras',
        icon: 'Truck',
        color: 'bg-yellow-500'
      });
    }

    if (user?.rol === 'admin') {
      actions.push({
        title: 'Sucursales',
        description: 'Gestionar sucursales',
        href: '/branches',
        icon: 'Building2',
        color: 'bg-teal-500'
      });
    }

    if (user?.rol === 'admin') {
      actions.push({
        title: 'Gestionar Usuarios',
        description: 'Administrar empleados',
        href: '/users',
        icon: 'Users',
        color: 'bg-orange-500'
      });
    }

    return actions;
  };

  const showStats = stats && ['admin', 'supervisor'].includes(user?.rol);
  const showLowStockAlert = lowStockAlertEnabled && stats?.productos_bajo_stock?.length > 0;

  return (
    <DashboardView
      loading={loading}
      stats={stats}
      user={user}
      noLeidas={noLeidas}
      ventasDiarias={ventasDiarias}
      diasGrafico={diasGrafico}
      setDiasGrafico={setDiasGrafico}
      branches={branches}
      branchFiltro={branchFiltro}
      setBranchFiltro={setBranchFiltro}
      primaryColor={primaryColor}
      getRoleBasedWelcome={getRoleBasedWelcome}
      getQuickActions={getQuickActions}
      showStats={showStats}
      showLowStockAlert={showLowStockAlert}
      formatAmount={formatAmount}
    />
  );
};

export default Dashboard;
