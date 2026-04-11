import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { parseApiDate } from '../../lib/utils';
import OwnerPanelView from './OwnerPanelView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const OWNER_API = `${BACKEND_URL}/owner`;
const OWNER_TOKEN_KEY = 'owner_token';

export const ownerAxios = axios.create({ baseURL: OWNER_API });

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatDate = (d) => {
  if (!d) return '—';
  try {
    return parseApiDate(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
};

export const formatMoney = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
};

const OwnerPanel = () => {
  const [token, setToken] = useState(localStorage.getItem(OWNER_TOKEN_KEY));
  const [view, setView] = useState('dashboard');
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [stats, setStats] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const handleLogout = useCallback(() => {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    setToken(null);
    setView('dashboard');
    setSelectedClienteId(null);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await ownerAxios.get('/stats', authHeader);
      setStats(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  }, [token]); // eslint-disable-line

  const loadClientes = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await ownerAxios.get('/clientes', authHeader);
      setClientes(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoadingData(false);
    }
  }, [token]); // eslint-disable-line

  const handleLogin = (tok) => {
    localStorage.setItem(OWNER_TOKEN_KEY, tok);
    setToken(tok);
  };

  const selectCliente = (id) => {
    setSelectedClienteId(id);
    setView('cliente_detalle');
  };

  useEffect(() => {
    if (!token) return;
    loadStats();
    loadClientes();
  }, [token, loadStats, loadClientes]);

  const urgentCount = clientes.filter(c =>
    (c.suscripcion?.status === 'activa' || c.suscripcion?.status === 'trial') &&
    c.dias_restantes <= 3 && c.activo
  ).length;

  const isClienteView = view === 'clientes' || view === 'cliente_detalle';

  return (
    <OwnerPanelView
      token={token}
      view={view}
      setView={setView}
      selectedClienteId={selectedClienteId}
      setSelectedClienteId={setSelectedClienteId}
      stats={stats}
      clientes={clientes}
      loadingData={loadingData}
      urgentCount={urgentCount}
      isClienteView={isClienteView}
      handleLogin={handleLogin}
      handleLogout={handleLogout}
      loadStats={loadStats}
      loadClientes={loadClientes}
      selectCliente={selectCliente}
    />
  );
};

export default OwnerPanel;
