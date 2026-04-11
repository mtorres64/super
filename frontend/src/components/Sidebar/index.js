import React, { useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext, API } from '../../App';
import axios from 'axios';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  Building2,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import SidebarView from './SidebarView';

const menuItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'supervisor', 'cajero']
  },
  {
    path: '/cash',
    label: 'Gestión de Caja',
    icon: CreditCard,
    roles: ['admin', 'supervisor', 'cajero']
  },
  {
    path: '/pos',
    label: 'Punto de Venta',
    icon: ShoppingCart,
    roles: ['admin', 'supervisor', 'cajero']
  },
  {
    path: '/products',
    label: 'Productos',
    icon: Package,
    roles: ['admin']
  },
  {
    path: '/branches',
    label: 'Sucursales',
    icon: Building2,
    roles: ['admin']
  },
  {
    path: '/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['admin', 'supervisor']
  },
  {
    path: '/compras',
    label: 'Compras',
    icon: ShoppingBag,
    roles: ['admin', 'supervisor']
  },
  {
    path: '/users',
    label: 'Usuarios',
    icon: Users,
    roles: ['admin']
  },
  {
    path: '/settings',
    label: 'Configuración',
    icon: Settings,
    roles: ['admin']
  },
  {
    path: '/cuenta',
    label: 'Cuenta',
    icon: Wallet,
    roles: ['admin']
  }
];

const Sidebar = ({ isOpen, onClose, stockAlertCount = 0, notifCount = 0 }) => {
  const { user, logout } = useContext(AuthContext);
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

  const allowedItems = menuItems.filter(item =>
    item.roles.includes(user?.rol)
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
    />
  );
};

export default Sidebar;
