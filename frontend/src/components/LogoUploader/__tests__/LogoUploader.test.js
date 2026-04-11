import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { renderWithProviders } from '../../../testUtils';
import LogoUploader from '../index';

const mock = new MockAdapter(axios);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe('LogoUploader', () => {
  test('muestra área de upload con texto "Sin logo" cuando no hay logo', () => {
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={jest.fn()} />
    );

    expect(screen.getByText('Sin logo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seleccionar Logo/i })).toBeInTheDocument();
  });

  test('muestra la imagen de preview si hay logo', () => {
    renderWithProviders(
      <LogoUploader currentLogo="https://example.com/logo.png" onLogoUpdate={jest.fn()} />
    );

    const img = screen.getByAltText('Logo preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  test('muestra botón "Eliminar" cuando hay logo', () => {
    renderWithProviders(
      <LogoUploader currentLogo="https://example.com/logo.png" onLogoUpdate={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument();
  });

  test('no muestra botón "Eliminar" cuando no hay logo', () => {
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={jest.fn()} />
    );

    expect(screen.queryByRole('button', { name: /Eliminar/i })).toBeNull();
  });

  test('click en "Seleccionar Logo" activa el input file (oculto)', async () => {
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={jest.fn()} />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    const selectBtn = screen.getByRole('button', { name: /Seleccionar Logo/i });
    await userEvent.click(selectBtn);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  test('subir un archivo válido llama a POST /config/upload-logo', async () => {
    mock.onPost(/\/config\/upload-logo/).reply(200, {
      logo_url: 'https://example.com/nuevo-logo.png',
    });

    // Mock FileReader para que dispare onload inmediatamente
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      readAsDataURL() {
        this.onload({ target: { result: 'data:image/png;base64,abc' } });
      }
    };

    const onLogoUpdate = jest.fn();
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={onLogoUpdate} />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['(logo)'], 'logo.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
      expect(mock.history.post[0].url).toMatch(/\/config\/upload-logo/);
    });

    await waitFor(() => {
      expect(onLogoUpdate).toHaveBeenCalledWith('https://example.com/nuevo-logo.png');
    });

    global.FileReader = originalFileReader;
  });

  test('eliminar logo llama a PUT /config con company_logo: null', async () => {
    mock.onPut(/\/config/).reply(200, {});

    const onLogoUpdate = jest.fn();
    renderWithProviders(
      <LogoUploader currentLogo="https://example.com/logo.png" onLogoUpdate={onLogoUpdate} />
    );

    const removeBtn = screen.getByRole('button', { name: /Eliminar/i });
    await userEvent.click(removeBtn);

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
      const req = JSON.parse(mock.history.put[0].data);
      expect(req.company_logo).toBeNull();
    });

    await waitFor(() => {
      expect(onLogoUpdate).toHaveBeenCalledWith(null);
    });
  });

  test('rechaza archivos que no son imágenes', async () => {
    const onLogoUpdate = jest.fn();
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={onLogoUpdate} />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['document'], 'doc.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // No debe haber llamado a la API
    await waitFor(() => {
      expect(mock.history.post).toHaveLength(0);
    });
    expect(onLogoUpdate).not.toHaveBeenCalled();
  });

  test('rechaza archivos mayores a 2MB', async () => {
    const onLogoUpdate = jest.fn();
    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={onLogoUpdate} />
    );

    const fileInput = document.querySelector('input[type="file"]');
    // Crear archivo de 3MB
    const bigContent = new Uint8Array(3 * 1024 * 1024);
    const file = new File([bigContent], 'big.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(0);
    });
    expect(onLogoUpdate).not.toHaveBeenCalled();
  });

  test('muestra estado "Subiendo..." mientras sube el archivo', async () => {
    // Respuesta diferida para observar el estado intermedio
    mock.onPost(/\/config\/upload-logo/).reply(() => new Promise(resolve =>
      setTimeout(() => resolve([200, { logo_url: 'https://example.com/logo.png' }]), 100)
    ));

    const originalFileReader = global.FileReader;
    global.FileReader = class {
      readAsDataURL() {
        this.onload({ target: { result: 'data:image/png;base64,abc' } });
      }
    };

    renderWithProviders(
      <LogoUploader currentLogo={null} onLogoUpdate={jest.fn()} />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['(logo)'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Subiendo\.\.\./i)).toBeInTheDocument();
    });

    global.FileReader = originalFileReader;
  });
});
