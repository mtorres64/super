import { useState, useCallback } from 'react';

export function useFormValidation(rules) {
  const [errors, setErrors] = useState({});

  const validate = useCallback((data) => {
    const newErrors = {};
    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const isEmpty = value === null || value === undefined || String(value).trim() === '';
      if (rule.required && isEmpty) {
        newErrors[field] = rule.message || 'Este campo es obligatorio';
      } else if (!isEmpty && rule.minLength && String(value).length < rule.minLength) {
        newErrors[field] = rule.minLengthMessage || `Mínimo ${rule.minLength} caracteres`;
      } else if (!isEmpty && rule.pattern && !rule.pattern.test(String(value))) {
        newErrors[field] = rule.patternMessage || 'Formato inválido';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [rules]);

  const clearError = useCallback((field) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  return { errors, validate, clearError, clearAll };
}
