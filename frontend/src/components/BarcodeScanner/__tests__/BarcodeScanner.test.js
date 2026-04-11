import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testUtils';
import BarcodeScanner from '../index';

// ── Mock de html5-qrcode ──────────────────────────────────────────────────────
jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    getState: jest.fn().mockReturnValue(1), // 1 = IDLE, no scanning
  })),
  Html5QrcodeSupportedFormats: {
    EAN_13: 0, EAN_8: 1, UPC_A: 2, UPC_E: 3,
    CODE_128: 4, CODE_39: 5, CODE_93: 6,
    ITF: 7, QR_CODE: 8,
  },
}));

// ── Mock de useModalClose para cierre inmediato ───────────────────────────────
jest.mock('../../../useModalClose', () => {
  return jest.fn((closeFn) => {
    const React = require('react');
    const [closing, setClosing] = React.useState(false);
    const handleClose = () => {
      setClosing(true);
      closeFn();
    };
    return [closing, handleClose];
  });
});

// ── Helper para mockear permisos de cámara ────────────────────────────────────
const mockCameraGranted = (cameras = [{ id: 'cam1', label: 'Front Camera' }]) => {
  const { Html5Qrcode } = require('html5-qrcode');
  Html5Qrcode.getCameras = jest.fn().mockResolvedValue(cameras);

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
    configurable: true,
  });
};

const mockCameraDenied = () => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')),
    },
    writable: true,
    configurable: true,
  });
};

describe('BarcodeScanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('muestra estado de verificación al cargar (cameraPermission = null)', () => {
    // getUserMedia tarda en resolver → el componente arranca en estado null
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockReturnValue(new Promise(() => {})), // nunca resuelve
      },
      writable: true,
      configurable: true,
    });
    const { Html5Qrcode } = require('html5-qrcode');
    Html5Qrcode.getCameras = jest.fn().mockReturnValue(new Promise(() => {}));

    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.getByText(/Verificando Cámara\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Verificando acceso a la cámara\.\.\./i)).toBeInTheDocument();
  });

  test('sin permisos de cámara muestra mensaje de error', async () => {
    mockCameraDenied();

    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acceso a Cámara Requerido/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Para escanear códigos de barras necesitamos acceso a tu cámara/i)
    ).toBeInTheDocument();
  });

  test('con permisos de cámara muestra la UI del escáner', async () => {
    mockCameraGranted();

    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Escanear Código de Barras/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /Iniciar Escáner/i })
    ).toBeInTheDocument();
  });

  test('botón cerrar en estado de verificación llama a onClose', () => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockReturnValue(new Promise(() => {})),
      },
      writable: true,
      configurable: true,
    });
    const { Html5Qrcode } = require('html5-qrcode');
    Html5Qrcode.getCameras = jest.fn().mockReturnValue(new Promise(() => {}));

    const onClose = jest.fn();
    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={onClose} />
    );

    const closeBtn = screen.getAllByRole('button').find(
      btn => btn.classList.contains('modal-close')
    );
    userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('botón cerrar en estado de error de permisos llama a onClose', async () => {
    mockCameraDenied();

    const onClose = jest.fn();
    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acceso a Cámara Requerido/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /Cerrar/i });
    await userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('botón Reintentar llama a checkCameraPermission (reintenta el flujo)', async () => {
    mockCameraDenied();

    const { Html5Qrcode } = require('html5-qrcode');

    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    });

    // Ahora preparamos la cámara para que el reintento tenga éxito
    Html5Qrcode.getCameras = jest.fn().mockResolvedValue([{ id: 'cam1', label: 'Camera 1' }]);
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });

    await userEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Escanear Código de Barras/i)).toBeInTheDocument();
    });
  });

  test('con múltiples cámaras muestra el selector de cámara', async () => {
    mockCameraGranted([
      { id: 'cam1', label: 'Front Camera' },
      { id: 'cam2', label: 'Back Camera' },
    ]);

    renderWithProviders(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    expect(screen.getByText('Front Camera')).toBeInTheDocument();
    expect(screen.getByText('Back Camera')).toBeInTheDocument();
  });
});
