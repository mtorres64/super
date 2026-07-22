import React from 'react';

const FieldError = ({ error }) => {
  if (!error) return null;
  return <p className="text-red-500 text-xs mt-1">{error}</p>;
};

export default FieldError;
