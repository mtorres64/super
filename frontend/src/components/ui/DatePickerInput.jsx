import React from 'react';

const DatePickerInput = ({ value, onChange, placeholder = 'dd/mm/aaaa', style }) => (
  <input
    type="date"
    className="form-input text-sm flex-shrink-0"
    style={style}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

export default DatePickerInput;
