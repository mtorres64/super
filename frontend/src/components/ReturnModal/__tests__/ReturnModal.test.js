import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import ReturnModal from '../index';

// useModalClose usa setTimeout(fn, 500). Con fake timers lo controlamos.
jest.useFakeTimers();

const mock = new MockAdapter(axios);
beforeEach(() => {
  mock.reset();
  // Agrega la clase no-animations para que el cierre sea inmediato (delay 0)
  document.body.classList.add('no-animations');
});
afterEach(() => {
  document.body.classList.remove('no-animations');
});
afterAll(() => mock.restore());

const makeSale = (overrides = {}) => ({
  id: 42,
  numero_factura: 'FAC-001',
  items: [
    { producto_id: 1, nombre: 'Producto A', cantidad: 3, precio_unitario: 100 },
    { producto_id: 2, nombre: 'Producto B', cantidad: 2, precio_unitario: 200 },
  ],
  ...overrides,
});

describe('ReturnModal', () => {
  test('renderiza el modal con los items de la venta', () => {
    const sale = makeSale();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    expect(screen.getByText(/Devolución — FAC-001/i)).toBeInTheDocument();
    expect(screen.getByText('Producto A')).toBeInTheDocument();
    expect(screen.getByText('Producto B')).toBeInTheDocument();
    // Checkbox por cada item + el de "Devolver todo"
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  test('seleccionar un item actualiza la cantidad disponible y muestra total', async () => {
    const sale = makeSale();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    // Marca el primer item (Producto A)
    const [, checkA] = screen.getAllByRole('checkbox'); // índice 0 = "Devolver todo"
    await userEvent.click(checkA);

    // Aparece el input de cantidad
    const quantityInput = screen.getByRole('spinbutton');
    expect(quantityInput).toBeInTheDocument();
    expect(quantityInput).toHaveValue(3); // cantidad disponible inicial

    // Aparece el total
    expect(screen.getByText(/Total a devolver/i)).toBeInTheDocument();
  });

  test('procesar devolución llama a POST /sales/:id/return', async () => {
    const sale = makeSale();
    mock.onPost(/\/sales\/42\/return/).reply(200, {
      numero_devolucion: 'DEV-001',
      total: 300,
    });

    const onSuccess = jest.fn();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    // Seleccionar el primer item
    const [, checkA] = screen.getAllByRole('checkbox');
    await userEvent.click(checkA);

    // Click en Confirmar Devolución
    const btnConfirm = screen.getByRole('button', { name: /Confirmar Devolución/i });
    await userEvent.click(btnConfirm);

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
      const req = JSON.parse(mock.history.post[0].data);
      expect(req.items[0].producto_id).toBe(1);
      expect(req.items[0].cantidad).toBe(3);
    });

    act(() => jest.runAllTimers());
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  test('botón cerrar (X) llama a onClose', async () => {
    const onClose = jest.fn();
    const sale = makeSale();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={onClose} onSuccess={jest.fn()} />
    );

    const allButtons = screen.getAllByRole('button');
    const xBtn = allButtons.find(btn => btn.classList.contains('modal-close'));
    await userEvent.click(xBtn);

    act(() => jest.runAllTimers());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('botón Cancelar llama a onClose', async () => {
    const onClose = jest.fn();
    const sale = makeSale();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={onClose} onSuccess={jest.fn()} />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    await userEvent.click(cancelBtn);

    act(() => jest.runAllTimers());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('items ya devueltos parcialmente muestran cantidad disponible restante', () => {
    const sale = makeSale();
    // Producto A: 3 vendidos, 1 ya devuelto → disponible: 2
    renderWithProviders(
      <ReturnModal
        sale={sale}
        returnedQty={{ 1: 1 }}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText(/1 ya devueltos/i)).toBeInTheDocument();
  });

  test('items completamente devueltos aparecen deshabilitados', () => {
    const sale = makeSale();
    // Producto A: 3 vendidos, 3 ya devueltos → exhausted
    renderWithProviders(
      <ReturnModal
        sale={sale}
        returnedQty={{ 1: 3 }}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText(/ya devuelto/i)).toBeInTheDocument();
    // El checkbox del item exhausted debe estar deshabilitado
    const checkboxes = screen.getAllByRole('checkbox');
    // El primer item agotado es checkboxes[1] (índice 0 = "Devolver todo")
    expect(checkboxes[1]).toBeDisabled();
  });

  test('Devolver todo selecciona todos los items disponibles', async () => {
    const sale = makeSale();
    renderWithProviders(
      <ReturnModal sale={sale} returnedQty={{}} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    const [selectAll] = screen.getAllByRole('checkbox');
    await userEvent.click(selectAll);

    // Ahora los dos items deben estar marcados
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });
});
