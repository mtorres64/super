import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import LogoUploaderView from './LogoUploaderView';

const LogoUploader = ({ currentLogo, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogo);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/config/upload-logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Logo subido exitosamente');
      onLogoUpdate(response.data.logo_url);
      setPreview(response.data.logo_url);
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: response.data.logo_url }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir el logo');
      setPreview(currentLogo);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      await axios.put(`${API}/config`, { company_logo: null });
      toast.success('Logo eliminado exitosamente');
      onLogoUpdate(null);
      setPreview(null);
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: null }));
    } catch (error) {
      toast.error('Error al eliminar el logo');
    }
  };

  return (
    <LogoUploaderView
      preview={preview}
      uploading={uploading}
      fileInputRef={fileInputRef}
      onFileSelect={handleFileSelect}
      onRemoveLogo={removeLogo}
      onSelectClick={() => fileInputRef.current?.click()}
    />
  );
};

export default LogoUploader;
