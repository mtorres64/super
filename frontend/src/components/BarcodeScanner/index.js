import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import BarcodeScannerView from './BarcodeScannerView';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);
  const html5QrcodeRef = useRef(null);
  const mountedRef = useRef(true);
  const lastScannedRef = useRef({ code: null, time: 0 });
  const pauseRef = useRef(false);
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  const [closing, animatedClose] = useModalClose(onClose);

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
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
        (decodedText) => {
          if (!mountedRef.current) return;
          if (pauseRef.current) return;

          const now = Date.now();
          if (
            lastScannedRef.current.code === decodedText &&
            now - lastScannedRef.current.time < 2500
          ) {
            return;
          }
          lastScannedRef.current = { code: decodedText, time: now };

          // Bloquea nuevos escaneos del mismo código durante 1500ms
          pauseRef.current = true;
          setTimeout(() => { pauseRef.current = false; }, 1500);

          onScanRef.current(decodedText);
          setScannedCount(prev => prev + 1);
          toast.success(`Código escaneado: ${decodedText}`);
        },
        () => {
          // Scan failure — called frequently, not logged
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

  const handleClose = () => {
    stopScanning();
    animatedClose();
  };

  return (
    <BarcodeScannerView
      closing={closing}
      scanning={scanning}
      cameraPermission={cameraPermission}
      cameras={cameras}
      selectedCamera={selectedCamera}
      scannedCount={scannedCount}
      onSelectedCameraChange={setSelectedCamera}
      onStartScanning={startScanning}
      onStopScanning={stopScanning}
      onClose={handleClose}
      onRetry={checkCameraPermission}
    />
  );
};

export default BarcodeScanner;
