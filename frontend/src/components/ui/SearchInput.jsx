import React, { useState } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  wrapperClassName = '',
  inputClassName,
  loading = false,
  onKeyDown: externalKeyDown,
}) => {
  const [open, setOpen] = useState(false);
  const { history, addSearch, removeSearch } = useSearchHistory();

  const baseClass = inputClassName ?? 'form-input pl-10';
  const withPad = value ? `${baseClass} pr-9` : baseClass;

  const save = () => {
    if (value && value.trim().length >= 2) addSearch(value.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { save(); setOpen(false); }
    if (e.key === 'Escape') setOpen(false);
    externalKeyDown?.(e);
  };

  const visible = history.filter(h =>
    !value || h.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
      <input
        type="text"
        placeholder={placeholder}
        className={withPad}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { save(); setTimeout(() => setOpen(false), 150); }}
        onKeyDown={handleKeyDown}
      />
      {value && (
        loading
          ? <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10"><div className="spinner spinner-on-light w-4 h-4 text-gray-400" /></div>
          : <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="h-4 w-4" />
            </button>
      )}
      {open && visible.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100 font-medium">Búsquedas recientes</div>
          {visible.map(term => (
            <div
              key={term}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer group"
              onMouseDown={() => { onChange(term); addSearch(term); setOpen(false); }}
            >
              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700 truncate">{term}</span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded transition-opacity"
                onMouseDown={e => { e.stopPropagation(); removeSearch(term); }}
                title="Eliminar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
