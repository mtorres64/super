import React, { useState, useEffect } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

// Combobox de selección única sobre una lista de opciones ya en memoria
// (sin API), con dropdown de opciones filtradas por texto + búsquedas
// recientes (historial propio vía `historyKey`). Estilo acorde a SearchInput.
const AutocompleteSelect = ({
  options,
  value,
  onSelect,
  onClear,
  placeholder = 'Buscar...',
  historyKey,
  icon: Icon = Search,
  wrapperClassName = '',
  inputClassName = 'form-input pl-9',
  maxOptions = 100,
  style,
}) => {
  const [text, setText] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const { history, addSearch, removeSearch } = useSearchHistory(
    historyKey ? `super_search_history_${historyKey}` : undefined
  );

  useEffect(() => { setText(value || ''); }, [value]);

  const normalized = text.trim().toLowerCase();
  const recentMatches = history.filter(h =>
    !normalized || h.toLowerCase().includes(normalized)
  );
  const filteredOptions = options
    .filter(o => !normalized || o.toLowerCase().includes(normalized))
    .slice(0, maxOptions);
  const combined = [...recentMatches, ...filteredOptions];

  useEffect(() => { setFocusedIdx(-1); }, [text, open]);

  const selectLabel = (label) => {
    setText(label);
    addSearch(label);
    onSelect(label);
    setOpen(false);
    setFocusedIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusedIdx(i => Math.min(i + 1, combined.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIdx >= 0 && combined[focusedIdx]) {
        selectLabel(combined[focusedIdx]);
      } else {
        const exact = options.find(o => o.toLowerCase() === normalized);
        if (exact) selectLabel(exact);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.target.blur();
    }
  };

  const handleClear = () => {
    setText('');
    onClear();
  };

  return (
    <div className={`relative ${wrapperClassName}`} style={style}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
      <input
        type="text"
        placeholder={placeholder}
        className={text ? `${inputClassName} pr-9` : inputClassName}
        value={text}
        autoComplete="off"
        onChange={e => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setText(value || ''); }, 150)}
        onKeyDown={handleKeyDown}
      />
      {text && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && combined.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {recentMatches.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100 font-medium">Búsquedas recientes</div>
              {recentMatches.map((term, i) => (
                <div
                  key={`recent-${term}`}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer group ${focusedIdx === i ? 'bg-gray-50' : ''}`}
                  onMouseDown={() => selectLabel(term)}
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
            </>
          )}
          {filteredOptions.length > 0 && (
            <>
              {recentMatches.length > 0 && (
                <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-t border-gray-100 font-medium">Productos</div>
              )}
              {filteredOptions.map((label, i) => {
                const idx = recentMatches.length + i;
                return (
                  <div
                    key={`opt-${label}`}
                    className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${focusedIdx === idx ? 'bg-gray-50' : ''}`}
                    onMouseDown={() => selectLabel(label)}
                  >
                    <span className="flex-1 text-sm text-gray-700 truncate">{label}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSelect;
