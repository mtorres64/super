import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { toast } from 'sonner';
import { parseApiDate } from '../../lib/utils';
import NotificacionesView from './NotificacionesView';

const TIPO_CONFIG = {
  plan_por_vencer_10: {
    label: '10 días para vencer',
    icon: 'Clock',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
  },
  plan_por_vencer_5: {
    label: '5 días para vencer',
    icon: 'AlertTriangle',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100',
  },
};

const formatFecha = (fecha) => {
  try {
    return parseApiDate(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const Notificaciones = () => {
  const { user } = useContext(AuthContext);
  const [notificaciones, setNotificaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  useEffect(() => {
    fetchNotificaciones();
  }, []);

  const fetchNotificaciones = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notificaciones?per_page=50`);
      setNotificaciones(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarLeida = async (id) => {
    try {
      await axios.put(`${API}/notificaciones/${id}/leer`);
      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      );
      window.dispatchEvent(new Event('notif-updated'));
    } catch {
      toast.error('Error al marcar notificación');
    }
  };

  const marcarTodasLeidas = async () => {
    setMarcandoTodas(true);
    try {
      await axios.put(`${API}/notificaciones/leer-todas`);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      toast.success('Todas las notificaciones marcadas como leídas');
      window.dispatchEvent(new Event('notif-updated'));
    } catch {
      toast.error('Error al marcar notificaciones');
    } finally {
      setMarcandoTodas(false);
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <NotificacionesView
      loading={loading}
      notificaciones={notificaciones}
      total={total}
      noLeidas={noLeidas}
      marcandoTodas={marcandoTodas}
      tipoConfig={TIPO_CONFIG}
      formatFecha={formatFecha}
      onRefresh={fetchNotificaciones}
      onMarcarLeida={marcarLeida}
      onMarcarTodasLeidas={marcarTodasLeidas}
    />
  );
};

export default Notificaciones;
