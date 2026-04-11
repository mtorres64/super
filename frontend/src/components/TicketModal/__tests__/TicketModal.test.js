import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import TicketModal from '../index';

// TicketModalView usa parseApiDate — mockeamos lib/utils para controlar fechas
jest.mock('../../../lib/utils', () => ({
  formatAmount: (v) => String(Number(v).toFixed(2)),
  parseApiDate: (s) => new Date('2024-06-15T10:00:00'),
}));

const makeSale = (overrides = {}) => ({
  id: 1,
  numero_factura: 'FAC-0042',
  fecha: '2024-06-15T10:00:00',
  metodo_pago: 'efectivo',
  subtotal: 1000,
  impuestos: 0,
  total: 1000,
  afip_estado: null,
  tipo_comprobante: null,
  nro_comprobante_afip: null,
  cae: null,
  items: [
    { nombre: 'Producto X', cantidad: 2, precio_unitario: 300, subtotal: 600 },
    { nombre: 'Producto Y', cantidad: 1, precio_unitario: 400, subtotal: 400 },
  ],
  ...overrides,
});

const makeConfig = (overrides = {}) => ({
  company_name: 'Mi Tienda Test',
  company_address: 'Calle Falsa 123',
  company_phone: '011-1234-5678',
  company_tax_id: '20-12345678-1',
  currency_symbol: '$',
  tax_rate: 0,
  receipt_footer_text: 'Gracias por su compra!',
  company_logo: null,
  ...overrides,
});

describe('TicketModal', () => {
  test('renderiza el ticket con datos de la venta', () => {
    const sale = makeSale();
    const config = makeConfig();

    render(
      <TicketModal
        sale={sale}
        config={config}
        afipConfig={null}
        cajeroName="Juan Perez"
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    expect(screen.getByText('Mi Tienda Test')).toBeInTheDocument();
    expect(screen.getByText('Calle Falsa 123')).toBeInTheDocument();
    expect(screen.getByText(/011-1234-5678/i)).toBeInTheDocument();
    expect(screen.getByText(/20-12345678-1/i)).toBeInTheDocument();
    // Comprobante (sin AFIP)
    expect(screen.getByText('FAC-0042')).toBeInTheDocument();
    // Cajero
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });

  test('muestra los items con cantidades y precios', () => {
    const sale = makeSale();
    render(
      <TicketModal
        sale={sale}
        config={makeConfig()}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    expect(screen.getByText('Producto X')).toBeInTheDocument();
    expect(screen.getByText('Producto Y')).toBeInTheDocument();
    // Detalles: "2 x $300.00"
    expect(screen.getByText(/2 x \$300\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/1 x \$400\.00/i)).toBeInTheDocument();
  });

  test('muestra el total correctamente', () => {
    const sale = makeSale({ total: 1000, subtotal: 1000, impuestos: 0 });
    render(
      <TicketModal
        sale={sale}
        config={makeConfig()}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    // Hay varias filas de total; buscamos la fila final TOTAL:
    const totalLabels = screen.getAllByText(/TOTAL:/i);
    expect(totalLabels.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1000\.00/i).length).toBeGreaterThan(0);
  });

  test('botón imprimir llama a onPrint', () => {
    const onPrint = jest.fn();
    render(
      <TicketModal
        sale={makeSale()}
        config={makeConfig()}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={onPrint}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Imprimir/i }));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  test('botón cerrar llama a onClose', () => {
    const onClose = jest.fn();
    render(
      <TicketModal
        sale={makeSale()}
        config={makeConfig()}
        afipConfig={null}
        cajeroName={null}
        onClose={onClose}
        onPrint={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('muestra el footer del ticket', () => {
    render(
      <TicketModal
        sale={makeSale()}
        config={makeConfig({ receipt_footer_text: 'Vuelva pronto!' })}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    expect(screen.getByText('Vuelva pronto!')).toBeInTheDocument();
  });

  test('usa símbolo de moneda del config', () => {
    render(
      <TicketModal
        sale={makeSale()}
        config={makeConfig({ currency_symbol: 'USD' })}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    expect(screen.getAllByText(/USD/i).length).toBeGreaterThan(0);
  });

  test('devuelve null si sale es null', () => {
    const { container } = render(
      <TicketModal
        sale={null}
        config={makeConfig()}
        afipConfig={null}
        cajeroName={null}
        onClose={jest.fn()}
        onPrint={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
