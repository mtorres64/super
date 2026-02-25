import React, { useState } from 'react';
import { BarChart3, ShoppingBag } from 'lucide-react';
import SalesReports from './SalesReports';
import PurchasesReport from './PurchasesReport';

const TABS = [
  { key: 'ventas', label: 'Ventas', icon: BarChart3 },
  { key: 'compras', label: 'Compras', icon: ShoppingBag }
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('ventas');

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
      {activeTab === 'ventas' && <SalesReports />}
      {activeTab === 'compras' && <PurchasesReport />}
    </div>
  );
};

export default Reports;
