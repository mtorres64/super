import React from 'react';
import { Link } from 'react-router-dom';
import PulsLogo from '../PulsLogo';
import { LogOut, X, ArrowLeftRight } from 'lucide-react';

const SidebarView = ({
  isOpen,
  config,
  user,
  allowedItems,
  notifCount,
  stockAlertCount,
  isActive,
  onClose,
  onLogout,
  activeBranch,
  canSwitchBranch,
  onSwitchBranch,
}) => {
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
            {path === '/dashboard' && notifCount > 0 && (
              <span className="nav-stock-badge">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details flex-1 min-w-0">
            <h4 className="truncate">{user?.nombre}</h4>
            <p className="capitalize">{user?.rol}</p>
            {activeBranch && (
              <p className="text-xs font-medium truncate" style={{ color: 'var(--primary, #10b981)' }}>
                {activeBranch.nombre}
              </p>
            )}
          </div>
          {canSwitchBranch && (
            <button
              onClick={onSwitchBranch}
              title="Cambiar sucursal"
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onLogout}
          className="btn btn-secondary w-full btn-sm"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default SidebarView;
