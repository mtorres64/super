import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LandingView from './LandingView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLAN_FEATURES_BASE = [
  'Sucursales ilimitadas',
  'Usuarios ilimitados',
  'Punto de venta con escáner y cámara',
  'Gestión de inventario con alertas',
  'Devoluciones parciales y totales',
  'Gestión de compras y proveedores',
  'Importación / exportación CSV',
  'Reportes y exportación Excel',
  'Notificaciones automáticas del sistema',
  'Soporte por email',
];

const formatCurrency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);

export default function Landing() {
  const [planes, setPlanes] = useState(null);

  useEffect(() => {
    axios.get(`${API}/public/planes`).then(r => setPlanes(r.data)).catch(() => {});
  }, []);

  const trialDias  = planes?.trial_dias ?? 15;
  const PLAN_FEATURES = [...PLAN_FEATURES_BASE, `${trialDias} días de prueba gratis`];

  return (
    <LandingView
      planes={planes}
      trialDias={trialDias}
      PLAN_FEATURES={PLAN_FEATURES}
      formatCurrency={formatCurrency}
    />
  );
}
