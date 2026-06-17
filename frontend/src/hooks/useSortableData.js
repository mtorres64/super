import { useState, useMemo } from 'react';

export function useSortableData(items, initialConfig = null, defaultDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState(initialConfig);

  const sortedItems = useMemo(() => {
    if (!items || !sortConfig) return items || [];
    return [...items].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = typeof bVal === 'string' ? bVal.toLowerCase() : '';
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const requestSort = (key) => {
    setSortConfig(prev => {
      if (prev?.key !== key) return { key, direction: defaultDirection };
      const opposite = prev.direction === 'asc' ? 'desc' : 'asc';
      // si hay defaultDirection no 'asc', nunca quitar el sort: ciclo desc ↔ asc
      if (defaultDirection !== 'asc') return { key, direction: opposite };
      // comportamiento original: asc → desc → null
      return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
    });
  };

  return { sortedItems, sortConfig, requestSort };
}
