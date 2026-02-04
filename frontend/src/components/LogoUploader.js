import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const LogoUploader = ({ currentLogo, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogo);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
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
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir el logo');
      setPreview(currentLogo); // Reset preview on error
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
    } catch (error) {
      toast.error('Error al eliminar el logo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Logo de la Empresa</h4>
        {preview && (
          <button
            onClick={removeLogo}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            <X className="w-4 h-4 inline mr-1" />
            Eliminar
          </button>
        )}
      </div>

      {/* Logo Preview */}
      <div className="flex items-center space-x-4">
        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          {preview ? (
            <img
              src={preview}
              alt="Logo preview"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-center">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Sin logo</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-secondary flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="spinner w-4 h-4" />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Seleccionar Logo</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 mt-2">
            Formatos: JPG, PNG, GIF. Máximo 2MB.
            <br />
            Recomendado: 200x200 píxeles.
          </p>
        </div>
      </div>

      {/* Logo Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h5 className="font-medium text-blue-900 text-sm mb-1">Recomendaciones:</h5>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Usa un fondo transparente (PNG) para mejores resultados</li>
          <li>• Mantén una relación de aspecto cuadrada o rectangular</li>
          <li>• Asegúrate de que sea legible en tamaños pequeños</li>
          <li>• El logo aparecerá en el login y barra lateral</li>
        </ul>
      </div>
    </div>
  );
};

export default LogoUploader;