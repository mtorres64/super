import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import IncomeExpenseReportView from './IncomeExpenseReportView';

const IncomeExpenseReport = () => {
  const [dateFilter, setDateFilter] = useState('month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      if (res.data.length === 1) setBranchFilter(res.data[0].id);
    } catch {}
  };

  const getDateRange = () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === 'month') {
      return { desde: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), hasta: fmt(today) };
    }
    if (dateFilter === 'year') {
      return { desde: `${today.getFullYear()}-01-01`, hasta: fmt(today) };
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
      const res = await axios.get(`${API}/reportes/ingresos-egresos`, { params });
      setData(res.data);
    } catch {
      toast.error('Error al cargar el reporte de ingresos y egresos');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => {
    if (val == null) return '—';
    return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <IncomeExpenseReportView
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      customDateFrom={customDateFrom}
      setCustomDateFrom={setCustomDateFrom}
      customDateTo={customDateTo}
      setCustomDateTo={setCustomDateTo}
      branchFilter={branchFilter}
      setBranchFilter={setBranchFilter}
      branches={branches}
      data={data}
      loading={loading}
      formatMoney={formatMoney}
    />
  );
};

export default IncomeExpenseReport;
