import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import Pagination from '../index';

const defaultProps = {
  currentPage: 1,
  totalPages: 5,
  totalItems: 50,
  itemsPerPage: 10,
  onPageChange: jest.fn(),
};

beforeEach(() => {
  defaultProps.onPageChange.mockClear();
});

describe('Pagination', () => {
  test('renderiza los botones de página correctos', () => {
    render(<Pagination {...defaultProps} />);

    // Páginas 1-5 deben aparecer (en la vista desktop)
    for (let i = 1; i <= 5; i++) {
      expect(screen.getAllByRole('button', { name: String(i) }).length).toBeGreaterThan(0);
    }
  });

  test('no renderiza nada cuando totalPages es 1', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={5} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('click en página siguiente llama a onPageChange con page+1', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    // Hay dos botones "Siguiente" (mobile y desktop con ChevronRight); usamos title
    const nextBtn = screen.getByTitle('Página siguiente');
    fireEvent.click(nextBtn);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });

  test('click en página anterior llama a onPageChange con page-1', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    const prevBtn = screen.getByTitle('Página anterior');
    fireEvent.click(prevBtn);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  test('click en un número de página llama a onPageChange con ese número', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    // Los botones de número de página en desktop son los que tienen texto numérico
    const page3Btns = screen.getAllByRole('button', { name: '3' });
    fireEvent.click(page3Btns[0]);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });

  test('página actual no tiene las clases de página inactiva', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    const page2Btns = screen.getAllByRole('button', { name: '2' });
    // La página activa no tiene la clase bg-white/text-gray-500 (solo las inactivas la tienen)
    const activePage = page2Btns.find(btn => !btn.className.includes('text-gray-500'));
    expect(activePage).toBeTruthy();
  });

  test('botón "Página anterior" deshabilitado en página 1', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const prevBtn = screen.getByTitle('Página anterior');
    expect(prevBtn).toBeDisabled();
  });

  test('botón "Primera página" deshabilitado en página 1', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const firstBtn = screen.getByTitle('Primera página');
    expect(firstBtn).toBeDisabled();
  });

  test('botón "Página siguiente" deshabilitado en la última página', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} />);

    const nextBtn = screen.getByTitle('Página siguiente');
    expect(nextBtn).toBeDisabled();
  });

  test('botón "Última página" deshabilitado en la última página', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} />);

    const lastBtn = screen.getByTitle('Última página');
    expect(lastBtn).toBeDisabled();
  });

  test('muestra información de resultados', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={jest.fn()}
      />
    );

    // "Mostrando 11 a 20 de 50 elementos"
    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  test('muestra ellipsis para rangos grandes de páginas', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={20}
        totalItems={200}
        itemsPerPage={10}
        onPageChange={jest.fn()}
      />
    );

    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  test('click en "Primera página" llama a onPageChange con 1', () => {
    render(<Pagination {...defaultProps} currentPage={4} />);

    const firstBtn = screen.getByTitle('Primera página');
    fireEvent.click(firstBtn);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
  });

  test('click en "Última página" llama a onPageChange con totalPages', () => {
    render(<Pagination {...defaultProps} currentPage={2} totalPages={5} />);

    const lastBtn = screen.getByTitle('Última página');
    fireEvent.click(lastBtn);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(5);
  });
});
