import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart3, ShoppingBag, TrendingUp, Scale, Archive } from 'lucide-react';
import SalesReports from './SalesReports';
import PurchasesReport from './PurchasesReport';
import MargensReport from './MargensReport';
import IncomeExpenseReport from './IncomeExpenseReport';
import CashReportsTab from './CashReportsTab';

const TABS = [
  { key: 'ventas',           label: 'Ventas',              icon: BarChart3 },
  { key: 'compras',          label: 'Compras',             icon: ShoppingBag },
  { key: 'margenes',         label: 'Márgenes',            icon: TrendingUp },
  { key: 'ingresos-egresos', label: 'Ingresos / Egresos',  icon: Scale },
  { key: 'caja',             label: 'Caja',                icon: Archive },
];

const Reports = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'ventas');

  return (
    <div>
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {activeTab === 'ventas'           && <SalesReports />}
      {activeTab === 'compras'          && <PurchasesReport />}
      {activeTab === 'margenes'         && <MargensReport />}
      {activeTab === 'ingresos-egresos' && <IncomeExpenseReport />}
      {activeTab === 'caja'             && <CashReportsTab />}
    </div>
  );
};

export default Reports;
