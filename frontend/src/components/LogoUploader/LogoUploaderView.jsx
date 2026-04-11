import React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const LogoUploaderView = ({ preview, uploading, fileInputRef, onFileSelect, onRemoveLogo, onSelectClick }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="font-medium text-gray-900">Logo de la Empresa</h4>
      {preview && (
        <button
          onClick={onRemoveLogo}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          <X className="w-4 h-4 inline mr-1" />
          Eliminar
        </button>
      )}
    </div>

    <div className="flex gap-6">
      {/* Left: preview + upload */}
      <div className="flex items-center space-x-4">
        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
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

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            onClick={onSelectClick}
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

      {/* Right: guidelines */}
      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 self-start">
        <h5 className="font-medium text-blue-900 text-sm mb-1">Recomendaciones:</h5>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Usa un fondo transparente (PNG) para mejores resultados</li>
          <li>• Mantén una relación de aspecto cuadrada o rectangular</li>
          <li>• Asegúrate de que sea legible en tamaños pequeños</li>
          <li>• El logo aparecerá en el login y barra lateral</li>
        </ul>
      </div>
    </div>
  </div>
);

export default LogoUploaderView;
