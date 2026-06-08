import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';

const BranchSelectionModal = ({ branches, loading, onSelect }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Seleccioná tu sucursal</h2>
          <p className="text-gray-500 text-sm mt-1">¿En qué sucursal vas a operar ahora?</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="spinner w-6 h-6" />
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => onSelect(branch.id)}
                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{branch.nombre}</p>
                  {branch.direccion && (
                    <p className="text-xs text-gray-500 truncate">{branch.direccion}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSelectionModal;
