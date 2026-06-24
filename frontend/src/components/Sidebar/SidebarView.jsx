import React from 'react';
import { Link } from 'react-router-dom';
import PulsLogo from '../PulsLogo';
import { LogOut, X, ArrowLeftRight, Settings, Shield, ArrowLeft } from 'lucide-react';

const SidebarView = ({
  isOpen,
  config,
  user,
  allowedItems,
  notifCount,
  stockAlertCount,
  tiendaPendingCount,
  isActive,
  onClose,
  onLogout,
  activeBranch,
  canSwitchBranch,
  onSwitchBranch,
  isImpersonating,
  impersonationEmpresa,
  onStopImpersonation,
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
            {path === '/tienda-admin' && tiendaPendingCount > 0 && (
              <span className="nav-stock-badge" style={{ background: '#f59e0b', color: 'white' }}>
                {tiendaPendingCount > 99 ? '99+' : tiendaPendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {isImpersonating && (
        <div style={{ margin: '0 10px 8px', background: '#ea580c', borderRadius: 10, padding: '10px 12px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, marginBottom: 3, opacity: 0.85 }}>
            <Shield size={12} />
            Modo impersonación
          </div>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>{impersonationEmpresa}</p>
          <button
            onClick={onStopImpersonation}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.72rem', fontWeight: 600, padding: '4px 8px', cursor: 'pointer', width: '100%' }}
          >
            <ArrowLeft size={11} />
            Volver al panel owner
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-info">
          {user?.rol === 'admin' ? (
            <Link
              to="/cuenta"
              onClick={onClose}
              title="Gestionar cuenta"
              className="flex items-center gap-3 flex-1 min-w-0 rounded-lg px-1 py-0.5 -mx-1 hover:bg-black/5 transition-colors"
            >
              <div className="user-avatar shrink-0">
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
            </Link>
          ) : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="user-avatar shrink-0">
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
            </div>
          )}
          <div className="shrink-0 flex flex-col gap-0.5">
            {canSwitchBranch && (
              <button
                onClick={onSwitchBranch}
                title="Cambiar sucursal"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            )}
            {user?.rol === 'admin' && (
              <Link
                to="/settings"
                onClick={onClose}
                title="Configuración"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </div>
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
