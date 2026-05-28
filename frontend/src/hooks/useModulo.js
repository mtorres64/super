import React from 'react';
import { AuthContext } from '../App';

/**
 * Retorna true si el módulo dado está activo para la empresa del usuario.
 * Uso: const tieneReportes = useModulo('reportes');
 */
export function useModulo(moduloId) {
  const { modulosActivos } = React.useContext(AuthContext);
  return modulosActivos.includes(moduloId);
}

/**
 * Retorna la lista completa de módulos activos.
 */
export function useModulos() {
  const { modulosActivos } = React.useContext(AuthContext);
  return modulosActivos;
}
