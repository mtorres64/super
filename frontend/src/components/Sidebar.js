import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext, API } from '../App';
import axios from 'axios';
import PulsLogo from './PulsLogo';
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Building2,
  ShoppingBag,
  Wallet,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
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

  const allowedItems = menuItems.filter(item => 
    item.roles.includes(user?.rol)
  );

  return (
    <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <button className="sidebar-close" onClick={onClose}>
        <X className="w-5 h-5" />
      </button>

      <div className="sidebar-header">
        {config?.company_name ? (
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
            {config.company_logo && (
              <img
                src={config.company_logo}
                alt="Logo"
                style={{ width: 'auto', maxWidth: 44, objectFit: 'contain', borderRadius: 4, alignSelf: 'stretch' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'inherit', lineHeight: 1.2 }}>
                {config.company_name}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>powered by</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', fontFamily: "'Exo', sans-serif", letterSpacing: '0.05em' }}>PULS</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="sidebar-title">
            <PulsLogo size="md" />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {allowedItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-item ${isActive(path) ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h4>{user?.nombre}</h4>
            <p className="capitalize">{user?.rol}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary w-full btn-sm"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;