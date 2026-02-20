import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Scan, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const html5QrcodeRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkCameraPermission();
    
    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        const scannerState = html5QrcodeRef.current.getState();
        if (scannerState === 2) { // Html5QrcodeScannerState.SCANNING
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        console.log('Scanner cleanup error:', e);
      }
      html5QrcodeRef.current = null;
    }
  };

  const checkCameraPermission = async () => {
    try {
      // Check if we have camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prefer back camera if available
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
        setCameraPermission(true);
      } else {
        setCameraPermission(false);
        toast.error('No se encontraron cámaras disponibles');
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      setCameraPermission(false);
      toast.error('Se necesita acceso a la cámara para escanear códigos');
    }
  };

  const startScanning = async () => {
    if (!selectedCamera || scanning) return;

    setScanning(true);

    try {
      if (html5QrcodeRef.current) {
        await cleanupScanner();
      }

      const html5QrCode = new Html5Qrcode("barcode-scanner");
      html5QrcodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 300, height: 120 },
        aspectRatio: 1.777778,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      };

      await html5QrCode.start(
        selectedCamera,
        config,
        (decodedText, decodedResult) => {
          if (!mountedRef.current) return;
          
          console.log('Barcode scanned:', decodedText);
          
          // Play success sound
          playSuccessSound();
          
          // Call parent callback
          onScan(decodedText);
          
          // Stop scanning
          stopScanning();
          
          toast.success(`Código escaneado: ${decodedText}`);
        },
        (errorMessage) => {
          // Handle scan failure - this is called frequently, so we don't log it
          // console.log('Scan error:', errorMessage);
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error(`Error al iniciar el escáner: ${error.message || error}`);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current && scanning) {
      try {
        await html5QrcodeRef.current.stop();
        console.log('Scanner stopped successfully');
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  if (cameraPermission === null) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Verificando Cámara...</h3>
            <button onClick={handleClose} className="modal-close">
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
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Acceso a Cámara Requerido</h3>
            <button onClick={handleClose} className="modal-close">
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
              <button onClick={handleClose} className="btn btn-secondary">
                Cerrar
              </button>
              <button onClick={checkCameraPermission} className="btn btn-primary">
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
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h3 className="modal-title">
            <Scan className="w-5 h-5 inline mr-2" />
            Escanear Código de Barras
          </h3>
          <button onClick={handleClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* El div del escáner siempre está en el DOM para que html5-qrcode lo encuentre */}
          <div
            id="barcode-scanner"
            className="w-full bg-black rounded-lg overflow-hidden mb-4"
            style={{ minHeight: '300px', display: scanning ? 'block' : 'none' }}
          ></div>

          {scanning ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4 flex items-center justify-center">
                <Volume2 className="w-4 h-4 mr-2" />
                Apunta la cámara hacia el código de barras
              </p>
              <button onClick={stopScanning} className="btn btn-secondary">
                <X className="w-4 h-4" />
                Detener Escaneo
              </button>
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
                    onChange={(e) => setSelectedCamera(e.target.value)}
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
                <button onClick={handleClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={startScanning}
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

export default BarcodeScanner;