import React, { useState, useEffect } from 'react';
import { Scale, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'month',  label: 'Este mes' },
  { key: 'year',   label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

const fmt = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;

const CustomTooltip = ({ active, payload, label, formatMoney }) => {
  if (!active || !payload?.length) return null;
  const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value ?? 0;
  const egresos  = payload.find(p => p.dataKey === 'egresos')?.value  ?? 0;
  const balance  = ingresos - egresos;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-sky-500 font-medium">Ingresos</span>
        <span className="text-gray-700">${formatMoney(ingresos)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-indigo-600 font-medium">Egresos</span>
        <span className="text-gray-700">${formatMoney(egresos)}</span>
      </div>
      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between gap-4">
        <span className="font-semibold text-gray-600">Balance</span>
        <span className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {balance >= 0 ? '+' : ''}${formatMoney(balance)}
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const IncomeExpenseReportView = ({
  dateFilter, setDateFilter,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  branchFilter, setBranchFilter,
  branches,
  data, loading,
  formatMoney,
}) => {
  const [chartColors, setChartColors] = useState({ primary: '#10b981', secondary: '#60a5fa' });

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const primary   = style.getPropertyValue('--primary').trim();
    const secondary = style.getPropertyValue('--secondary').trim();
    setChartColors({
      primary:   primary   || '#10b981',
      secondary: secondary || '#60a5fa',
    });
  }, []);

  const tickFormatter = (v) => {
    if (v === 0) return '$0';
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Scale className="w-7 h-7 text-primary" />
            Reporte de ingresos y egresos
          </h1>
          <p className="text-gray-500 text-sm">Comparativa de ventas e ingresos vs compras y egresos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label mb-1">Período</label>
            <div className="flex gap-1 flex-wrap items-center">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDateFilter(opt.key)}
                  className={`px-3 rounded font-medium transition-colors border ${
                    dateFilter === opt.key ? 'text-white' : 'bg-white text-gray-600 border-gray-300'
                  }`}
                  style={{
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    ...(dateFilter === opt.key
                      ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                      : {})
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="form-input"
                value={customDateFrom}
                onChange={e => setCustomDateFrom(e.target.value)}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                className="form-input"
                value={customDateTo}
                onChange={e => setCustomDateTo(e.target.value)}
              />
            </div>
          )}

          {branches.length > 0 && (
            <div>
              <label className="form-label mb-1">Sucursal</label>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '140px' }}
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                {branches.filter(b => b.activo).map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="spinner w-8 h-8" />
        </div>
      ) : !data ? null : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={TrendingUp}
              label="Total ingresos"
              value={`$${formatMoney(data.total_ingresos)}`}
              color="bg-sky-50 text-sky-500"
            />
            <StatCard
              icon={TrendingDown}
              label="Total egresos"
              value={`$${formatMoney(data.total_egresos)}`}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={Wallet}
              label="Balance total"
              value={`$${formatMoney(data.balance_total)}`}
              color={data.balance_total >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}
            />
          </div>

          {/* Gráfico */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">
              Comparativa de ingresos y egresos
            </h3>
            {data.meses.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No hay datos para el período seleccionado</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.meses} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="mes_label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip content={<CustomTooltip formatMoney={formatMoney} />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value}</span>
                    )}
                  />
                  <ReferenceLine y={0} stroke="#e5e7eb" />
                  <Bar dataKey="ingresos" name="Ventas e Ingresos" fill={chartColors.primary}   radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="egresos"  name="Compras y Egresos" fill={chartColors.secondary} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabla mensual */}
          {data.meses.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-700">Detalle mensual</h3>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Mes</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-sky-500 uppercase">Ingresos</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-indigo-600 uppercase">Egresos</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meses.map((row, i) => (
                      <tr key={row.mes} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-4 py-2 font-medium text-gray-800">{row.mes_label}</td>
                        <td className="px-4 py-2 text-right text-sky-600 font-medium">${formatMoney(row.ingresos)}</td>
                        <td className="px-4 py-2 text-right text-indigo-600">${formatMoney(row.egresos)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${row.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {row.balance >= 0 ? '+' : ''}${formatMoney(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-sky-600">${formatMoney(data.total_ingresos)}</td>
                      <td className="px-4 py-2 text-right font-bold text-indigo-600">${formatMoney(data.total_egresos)}</td>
                      <td className={`px-4 py-2 text-right font-bold ${data.balance_total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {data.balance_total >= 0 ? '+' : ''}${formatMoney(data.balance_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IncomeExpenseReportView;
