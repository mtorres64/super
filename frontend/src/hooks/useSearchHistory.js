import { useState } from 'react';

const STORAGE_KEY = 'super_search_history';

const getMaxItems = () => {
  const v = parseInt(localStorage.getItem('search_history_count'));
  return isNaN(v) ? 3 : v;
};

export const useSearchHistory = () => {
  const maxItems = getMaxItems();

  const [history, setHistory] = useState(() => {
    if (maxItems === 0) return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeSearch = (term) => {
    if (maxItems === 0) return;
    setHistory(prev => {
      const next = prev.filter(h => h !== term);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { history, addSearch, removeSearch };
};
