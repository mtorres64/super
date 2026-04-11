import React from 'react';
import { Camera, X, Scan, Volume2 } from 'lucide-react';

const BarcodeScannerView = ({
  closing,
  scanning,
  cameraPermission,
  cameras,
  selectedCamera,
  scannedCount,
  onSelectedCameraChange,
  onStartScanning,
  onStopScanning,
  onClose,
  onRetry,
}) => {
  if (cameraPermission === null) {
    return (
      <div className={`modal-overlay${closing ? ' closing' : ''}`}>
        <div className={`modal-content${closing ? ' closing' : ''}`}>
          <div className="modal-header">
            <h3 className="modal-title">Verificando Cámara...</h3>
            <button onClick={onClose} className="modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Verificando acceso a la cámara...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (cameraPermission === false) {
    return (
      <div className={`modal-overlay${closing ? ' closing' : ''}`}>
        <div className={`modal-content${closing ? ' closing' : ''}`}>
          <div className="modal-header">
            <h3 className="modal-title">Acceso a Cámara Requerido</h3>
            <button onClick={onClose} className="modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 text-center">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Para escanear códigos de barras necesitamos acceso a tu cámara.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Por favor, permite el acceso a la cámara en tu navegador y recarga la página.
            </p>
            <div className="flex justify-center space-x-3">
              <button onClick={onClose} className="btn btn-secondary">
                Cerrar
              </button>
              <button onClick={onRetry} className="btn btn-primary">
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className={`modal-content max-w-lg${closing ? ' closing' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Scan className="w-5 h-5 inline mr-2" />
            Escanear Código de Barras
          </h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div
            id="barcode-scanner"
            className="w-full bg-black rounded-lg overflow-hidden mb-4"
            style={{ minHeight: '300px', display: scanning ? 'block' : 'none' }}
          ></div>

          {scanning ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2 flex items-center justify-center">
                <Volume2 className="w-4 h-4 mr-2" />
                Apunta la cámara hacia el código de barras
              </p>
              {scannedCount > 0 && (
                <p className="text-sm font-semibold text-green-600 mb-3">
                  {scannedCount} producto{scannedCount !== 1 ? 's' : ''} escaneado{scannedCount !== 1 ? 's' : ''}
                </p>
              )}
              <div className="flex justify-center space-x-3">
                <button onClick={onStopScanning} className="btn btn-secondary">
                  <X className="w-4 h-4" />
                  Pausar
                </button>
                <button onClick={onClose} className="btn btn-primary">
                  Finalizar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Presiona el botón para comenzar a escanear
                </p>
                <p className="text-sm text-gray-500">
                  Apunta la cámara hacia el código de barras
                </p>
              </div>

              {cameras.length > 1 && (
                <div className="mb-4">
                  <label className="form-label text-sm">Cámara</label>
                  <select
                    className="form-select"
                    value={selectedCamera || ''}
                    onChange={(e) => onSelectedCameraChange(e.target.value)}
                  >
                    {cameras.map((cam, index) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Cámara ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <button onClick={onClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={onStartScanning}
                  className="btn btn-primary"
                  disabled={!selectedCamera}
                >
                  <Camera className="w-4 h-4" />
                  Iniciar Escáner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerView;
