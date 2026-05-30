import React from 'react';

const SortIcon = ({ columnKey, sortConfig, dark = false }) => {
  const isActive = sortConfig?.key === columnKey;
  if (!isActive) {
    return (
      <span className={`ml-1 text-xs align-middle ${dark ? 'text-gray-600' : 'text-gray-300'}`}>↕</span>
    );
  }
  return (
    <span className={`ml-1 text-xs align-middle font-bold ${dark ? 'text-emerald-400' : 'text-green-600'}`}>
      {sortConfig.direction === 'asc' ? '↑' : '↓'}
    </span>
  );
};

export default SortIcon;
