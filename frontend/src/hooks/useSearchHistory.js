import { useState } from 'react';

const DEFAULT_STORAGE_KEY = 'super_search_history';

const getMaxItems = () => {
  const v = parseInt(localStorage.getItem('search_history_count'));
  return isNaN(v) ? 3 : v;
};

// `storageKey` permite que distintos buscadores (ej. texto libre vs. un filtro
// de producto puntual) tengan su propio historial en vez de compartir uno solo.
export const useSearchHistory = (storageKey = DEFAULT_STORAGE_KEY) => {
  const maxItems = getMaxItems();

  const [history, setHistory] = useState(() => {
    if (maxItems === 0) return [];
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch {
      return [];
    }
  });

  const addSearch = (term) => {
    if (maxItems === 0 || !term || term.trim().length < 2) return;
    const normalized = term.trim();
    setHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== normalized.toLowerCase());
      const next = [normalized, ...filtered].slice(0, maxItems);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const removeSearch = (term) => {
    if (maxItems === 0) return;
    setHistory(prev => {
      const next = prev.filter(h => h !== term);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return { history, addSearch, removeSearch };
};
