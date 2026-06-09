import React, { useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext, API } from '../../App';
import axios from 'axios';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  CreditCard,
  Building2,
  ShoppingBag,
  Users,
} from 'lucide-react';
import SidebarView from './SidebarView';

const menuItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'supervisor', 'cajero'],
    modulo: null,
  },
  {
    path: '/cash',
    label: 'Gestión de Caja',
    icon: CreditCard,
    roles: ['admin', 'supervisor', 'cajero'],
    modulo: 'caja',
  },
  {
    path: '/pos',
    label: 'Punto de Venta',
    icon: ShoppingCart,
    roles: ['admin', 'supervisor', 'cajero'],
    modulo: 'pos',
  },
  {
    path: '/products',
    label: 'Productos',
    icon: Package,
    roles: ['admin'],
    modulo: 'inventario',
  },
  {
    path: '/compras',
    label: 'Compras',
    icon: ShoppingBag,
    roles: ['admin', 'supervisor'],
    modulo: 'compras',
  },
  {
    path: '/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['admin', 'supervisor'],
    modulo: 'reportes',
  },
  {
    path: '/customers',
    label: 'Clientes',
    icon: Users,
    roles: ['admin'],
    modulo: 'clientes',
  },
  {
    path: '/branches',
    label: 'Sucursales',
    icon: Building2,
    roles: ['admin'],
    modulo: 'inventario',
  },
];

const Sidebar = ({ isOpen, onClose, stockAlertCount = 0, notifCount = 0 }) => {
  const { user, logout, modulosActivos, activeBranch, userBranches, openBranchSelector } = useContext(AuthContext);
  const location = useLocation();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchConfiguration();
  }, []);

  useEffect(() => {
    const handleLogoUpdate = (e) => {
      setConfig(prev => prev ? { ...prev, company_logo: e.detail } : prev);
    };
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading configuration');
    }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  const tieneMultiSucursal = modulosActivos.includes('multi_sucursal');
  const allowedItems = menuItems
    .filter(item => {
      if (!item.roles.includes(user?.rol)) return false;
      if (item.modulo && modulosActivos.length > 0 && !modulosActivos.includes(item.modulo)) return false;
      return true;
    })
    .map(item =>
      item.path === '/branches'
        ? { ...item, label: tieneMultiSucursal ? 'Sucursales' : 'Mi Sucursal' }
        : item
    );

  return (
    <SidebarView
      isOpen={isOpen}
      config={config}
      user={user}
      allowedItems={allowedItems}
      notifCount={notifCount}
      stockAlertCount={stockAlertCount}
      isActive={isActive}
      onClose={onClose}
      onLogout={handleLogout}
      activeBranch={activeBranch}
      canSwitchBranch={tieneMultiSucursal && userBranches.length > 1}
      onSwitchBranch={openBranchSelector}
    />
  );
};

export default Sidebar;
