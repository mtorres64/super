import React from 'react';
import { render, screen } from '@testing-library/react';
import LabelPrintModal from '../LabelPrintModal';

const productos = [
  { id: '1', nombre: 'ACEITE FINCA EL LAZO X900CC', categoria_nombre: 'INFUSIONES', codigo_barras: '7798374760011', precio: 2150 },
  { id: '2', nombre: 'GALLETITAS SURTIDAS', categoria_nombre: 'SNACKS', codigo_barras: '7790310985137', precio: 570 },
];

test('renders labels with name, price and barcode for each product', () => {
  render(<LabelPrintModal productos={productos} onClose={() => {}} />);
  expect(screen.getByText('ACEITE FINCA EL LAZO X900CC')).toBeInTheDocument();
  expect(screen.getByText('GALLETITAS SURTIDAS')).toBeInTheDocument();
  expect(screen.getByText('$2150.00')).toBeInTheDocument();
  expect(document.querySelectorAll('#label-print-area svg').length).toBe(2);
});

test('toggling "mostrar precio" off hides the price', () => {
  render(<LabelPrintModal productos={productos} onClose={() => {}} />);
  expect(screen.getByText('$2150.00')).toBeInTheDocument();
  screen.getByLabelText('Mostrar precio').click();
  expect(screen.queryByText('$2150.00')).not.toBeInTheDocument();
});
