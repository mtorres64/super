import React, { useState, useEffect, useContext } from 'react';
import useModalClose from '../../useModalClose';
import axios from 'axios';
import { API, AuthContext } from '../../App';
import { formatAmount, parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import CashManagerView from './CashManagerView';

const CashManager = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState(false);
  const [closingCash, setClosingCash] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openModalClosing, closeOpenModal] = useModalClose(() => setShowOpenModal(false));
  const [closeModalClosing, closeCloseModal] = useModalClose(() => setShowCloseModal(false));
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [showAdminCloseModal, setShowAdminCloseModal] = useState(false);
  const [adminCloseTarget, setAdminCloseTarget] = useState(null);
  const [adminCloseForm, setAdminCloseForm] = useState({ monto_final: '', observaciones: '' });
  const [adminClosing, setAdminClosing] = useState(false);
  const [adminCloseModalClosing, closeAdminCloseModal] = useModalClose(() => setShowAdminCloseModal(false));
  const { user, activeBranch } = useContext(AuthContext);

  const [openForm, setOpenForm] = useState({
    monto_inicial: '',
    observaciones: ''
  });

  const [closeForm, setCloseForm] = useState({
    monto_final: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchCurrentSession();
  }, []);

  useEffect(() => {
    if (user?.rol === 'admin') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      const perPage = response.data?.items_per_page || 10;
      setHistoryPerPage(perPage);
      fetchHistory(1, perPage);
    } catch {
      fetchHistory(1, historyPerPage);
    }
  };

  const fetchHistory = async (page = 1, perPage) => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API}/cash-sessions/history`, {
        params: { page, per_page: perPage ?? historyPerPage },
      });
      setSessionHistory(response.data.items);
      setHistoryTotal(response.data.total);
      setHistoryTotalPages(response.data.total_pages);
      setHistoryPage(page);
    } catch (error) {
      // silencioso
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryPageChange = (page) => {
    fetchHistory(page);
  };

  const openAdminCloseModal = (session) => {
    setAdminCloseTarget(session);
    setAdminCloseForm({ monto_final: '', observaciones: '' });
    setShowAdminCloseModal(true);
  };

  const adminCloseSession = async () => {
    setAdminClosing(true);
    try {
      await axios.put(`${API}/cash-sessions/${adminCloseTarget.id}/close`, {
        monto_final: parseFloat(adminCloseForm.monto_final),
        observaciones: adminCloseForm.observaciones,
      });
      closeAdminCloseModal();
      toast.success(`Caja de ${adminCloseTarget.user_nombre} cerrada`);
      fetchHistory(historyPage);
      // Si el admin también tiene esa caja abierta, refrescar estado propio
      fetchCurrentSession();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar la caja');
    } finally {
      setAdminClosing(false);
    }
  };

  const fetchCurrentSession = async () => {
    try {
      const response = await axios.get(`${API}/cash-sessions/current`);
      setCurrentSession(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Error al verificar sesión de caja');
      }
    } finally {
      setLoading(false);
    }
  };

  const openCashSession = async () => {
    setOpeningCash(true);
    try {
      const response = await axios.post(`${API}/cash-sessions`, {
        monto_inicial: parseFloat(openForm.monto_inicial),
        observaciones: openForm.observaciones,
        branch_id: activeBranch?.id
      });
      setCurrentSession(response.data);
      closeOpenModal();
      setOpenForm({ monto_inicial: '', observaciones: '' });
      toast.success('Caja abierta exitosamente');
      if (user?.rol === 'admin') fetchHistory(historyPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al abrir caja');
    } finally {
      setOpeningCash(false);
    }
  };

  const closeCashSession = async () => {
    setClosingCash(true);
    try {
      const response = await axios.put(`${API}/cash-sessions/${currentSession.id}/close`, {
        monto_final: parseFloat(closeForm.monto_final),
        observaciones: closeForm.observaciones
      });
      setCurrentSession(null);
      closeCloseModal();
      setCloseForm({ monto_final: '', observaciones: '' });
      toast.success('Caja cerrada exitosamente');
      if (user?.rol === 'admin') fetchHistory(1);  // volver a pág 1 al cerrar

      // Show closing summary
      const diferencia = response.data.diferencia;
      if (diferencia !== 0) {
        const message = diferencia > 0
          ? `Sobrante: $${formatAmount(diferencia)}`
          : `Faltante: $${formatAmount(Math.abs(diferencia))}`;
        toast.info(message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar caja');
    } finally {
      setClosingCash(false);
    }
  };

  const formatDate = (dateString) => {
    const date = parseApiDate(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <CashManagerView
      user={user}
      loading={loading}
      currentSession={currentSession}
      openingCash={openingCash}
      closingCash={closingCash}
      showOpenModal={showOpenModal}
      showCloseModal={showCloseModal}
      openModalClosing={openModalClosing}
      closeModalClosing={closeModalClosing}
      openForm={openForm}
      closeForm={closeForm}
      setShowOpenModal={setShowOpenModal}
      setShowCloseModal={setShowCloseModal}
      setOpenForm={setOpenForm}
      setCloseForm={setCloseForm}
      openCashSession={openCashSession}
      closeCashSession={closeCashSession}
      closeOpenModal={closeOpenModal}
      closeCloseModal={closeCloseModal}
      formatDate={formatDate}
      formatAmount={formatAmount}
      parseApiDate={parseApiDate}
      sessionHistory={sessionHistory}
      historyLoading={historyLoading}
      historyPage={historyPage}
      historyTotal={historyTotal}
      historyTotalPages={historyTotalPages}
      historyPerPage={historyPerPage}
      onHistoryPageChange={handleHistoryPageChange}
      showAdminCloseModal={showAdminCloseModal}
      adminCloseTarget={adminCloseTarget}
      adminCloseForm={adminCloseForm}
      setAdminCloseForm={setAdminCloseForm}
      adminCloseModalClosing={adminCloseModalClosing}
      adminClosing={adminClosing}
      openAdminCloseModal={openAdminCloseModal}
      closeAdminCloseModal={closeAdminCloseModal}
      adminCloseSession={adminCloseSession}
    />
  );
};

export default CashManager;
