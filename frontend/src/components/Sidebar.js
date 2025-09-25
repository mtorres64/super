import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  Store, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
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
      path: '/sales', 
      label: 'Reportes', 
      icon: BarChart3, 
      roles: ['admin', 'supervisor'] 
    },
    { 
      path: '/users', 
      label: 'Usuarios', 
      icon: Users, 
      roles: ['admin'] 
    }
  ];

  const allowedItems = menuItems.filter(item => 
    item.roles.includes(user?.rol)
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Store className="w-6 h-6 text-green-600" />
          SuperMarket POS
        </div>
      </div>

      <nav className="sidebar-nav">
        {allowedItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-item ${isActive(path) ? 'active' : ''}`}
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