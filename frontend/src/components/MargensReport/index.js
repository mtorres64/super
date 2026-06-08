import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { parseApiDate } from '../../lib/utils';
import { toast } from 'sonner';
import MargensReportView from './MargensReportView';

const MargensReport = () => {
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');
  const [branchFilter, setBranchFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [detailModal, setDetailModal] = useState(null); // { type, row }
  const [expandedSection, setExpandedSection] = useState('por_fecha');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateFilter, branchFilter, customDateFrom, customDateTo]);

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`);
      setBranches(res.data);
      if (res.data.length === 1) {
        setBranchFilter(res.data[0].id);
      }
    } catch {}
  };

  const getDateRange = () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === 'month') {
      const desde = new Date(today.getFullYear(), today.getMonth(), 1);
      return { desde: fmt(desde), hasta: fmt(today) };
    }
    if (dateFilter === 'week') {
      const day = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const desde = new Date(today);
      desde.setDate(today.getDate() - day);
      return { desde: fmt(desde), hasta: fmt(today) };
    }
    if (dateFilter === 'last30') {
      const desde = new Date(today);
      desde.setDate(today.getDate() - 29);
      return { desde: fmt(desde), hasta: fmt(today) };
    }
    if (dateFilter === 'year') {
      const desde = new Date(today.getFullYear(), 0, 1);
      return { desde: fmt(desde), hasta: fmt(today) };
    }
    if (dateFilter === 'custom') {
      if (!customDateFrom || !customDateTo) return null;
      return { desde: customDateFrom, hasta: customDateTo };
    }
    return null;
  };

  const fetchData = async () => {
    const range = getDateRange();
    if (!range) return;
    setLoading(true);
    try {
      const params = { fecha_desde: range.desde, fecha_hasta: range.hasta };
      if (branchFilter !== 'all') params.branch_id = branchFilter;
      const res = await axios.get(`${API}/reportes/margenes`, { params });
      setData(res.data);
    } catch {
      toast.error('Error al cargar el reporte de márgenes');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = parseApiDate(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MargensReportView
      data={data}
      branches={branches}
      loading={loading}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      branchFilter={branchFilter}
      setBranchFilter={setBranchFilter}
      customDateFrom={customDateFrom}
      setCustomDateFrom={setCustomDateFrom}
      customDateTo={customDateTo}
      setCustomDateTo={setCustomDateTo}
      detailModal={detailModal}
      setDetailModal={setDetailModal}
      expandedSection={expandedSection}
      setExpandedSection={setExpandedSection}
      formatMoney={formatMoney}
      formatDate={formatDate}
      formatDateTime={formatDateTime}
      onRefresh={fetchData}
    />
  );
};

export default MargensReport;
