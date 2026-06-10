import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { formatAmount, parseApiDate } from '../../lib/utils';
import { Eye, Archive, Building2, User } from 'lucide-react';
import Pagination from '../Pagination';

const CashReportsTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(location.state?.branchFilter ?? '');
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState(location.state?.userFilter ?? '');
  const PER_PAGE = 15;

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchSessions(page);
  }, [page, branchFilter, userFilter]);

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`);
      setBranches(res.data.filter(b => b.activo));
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch {}
  };

  const fetchSessions = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: PER_PAGE };
      if (branchFilter) params.branch_id = branchFilter;
      if (userFilter)   params.user_id   = userFilter;
      const res = await axios.get(`${API}/cash-sessions/history`, { params });
      setSessions(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {}
    finally { setLoading(false); }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return parseApiDate(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Archive className="w-7 h-7 text-primary" />
          Reportes de Caja
        </h1>
        <p className="text-gray-500 text-sm">Historial de sesiones y arqueos de caja</p>
      </div>

      {/* Filtros */}
      {(branches.length > 1 || users.length > 0) && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            {branches.length > 1 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '160px' }}
                  value={branchFilter}
                  onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Todas las sucursales</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {users.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '160px' }}
                  value={userFilter}
                  onChange={e => { setUserFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Todos los usuarios</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Sesiones de caja ({total})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="spinner w-8 h-8" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay sesiones registradas</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cajero</th>
                <th className="hidden md:table-cell">Sucursal</th>
                <th className="hidden lg:table-cell">Apertura</th>
                <th className="hidden lg:table-cell">Cierre</th>
                <th style={{ textAlign: 'right' }}>Ventas</th>
                <th style={{ textAlign: 'right' }} className="hidden md:table-cell">Diferencia</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const isOpen = s.status === 'abierta';
                return (
                  <tr key={s.id}>
                    <td data-mobile="title">
                      <span className="font-medium text-gray-800">{s.user_nombre || '—'}</span>
                    </td>
                    <td className="hidden md:table-cell text-gray-600">{s.branch_nombre || '—'}</td>
                    <td className="hidden lg:table-cell text-gray-600 text-sm">{formatDate(s.fecha_apertura)}</td>
                    <td className="hidden lg:table-cell text-gray-600 text-sm">{s.fecha_cierre ? formatDate(s.fecha_cierre) : '—'}</td>
                    <td className="text-right font-medium text-gray-800">${formatAmount(s.monto_ventas)}</td>
                    <td className="hidden md:table-cell text-right">
                      {s.diferencia != null ? (
                        <span className={s.diferencia >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {s.diferencia >= 0 ? '+' : ''}${formatAmount(s.diferencia)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isOpen ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Abierta</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Cerrada</span>
                      )}
                    </td>
                    <td data-mobile="actions">
                      <button
                        onClick={() => navigate(`/cash-report/${s.id}`, { state: { branchFilter, userFilter } })}
                        className="btn btn-sm flex items-center gap-1"
                        style={{ background: 'var(--secondary)', color: 'var(--secondary-text)' }}
                        title="Ver reporte"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={PER_PAGE}
          onPageChange={setPage}
          itemName="sesiones"
        />
      </div>
    </div>
  );
};

export default CashReportsTab;
