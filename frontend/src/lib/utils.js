import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Parsea un string de fecha de la API asegurando que se interprete como UTC.
// El backend devuelve ISO strings con offset (+00:00), pero como medida defensiva
// agrega 'Z' si la cadena no tiene información de timezone.
export function parseApiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.endsWith('Z') || s.includes('+') || s.includes('-', 10)) return new Date(s);
  return new Date(s + 'Z');
}

// Formatea un número monetario con punto para miles y coma para decimales
// Ej: 12500.3 → "12.500,30"
export function formatAmount(value) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}
