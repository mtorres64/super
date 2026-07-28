import { useState } from 'react';

const STORAGE_KEY = 'super_search_history';
const MAX_ITEMS = 3;

export const useSearchHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const addSearch = (term) => {
    if (!term || term.trim().length < 2) return;
    const normalized = term.trim();
    setHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== normalized.toLowerCase());
      const next = [normalized, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeSearch = (term) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== term);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { history, addSearch, removeSearch };
};
