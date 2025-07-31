import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import imageUploadService from '../services/imageUploadService.js';

const ImageUpload = ({
  onUpload,
  onError,
  userId = null,
  folder = 'uploads',
  accept = 'image/*',
  maxFiles = 1,
  className = '',
  showPreview = true,
  uploadType = 'generic' // 'profile', 'question', 'generic'
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const handleFileValidation = useCallback((fileList) => {
    const validFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file, index) => {
      if (index >= maxFiles) {
        errors.push(`Máximo de ${maxFiles} arquivo(s) permitido(s)`);
        return;
      }

      const validation = imageUploadService.validateImageFile(file);
      if (validation.isValid) {
        validFiles.push({
          file,
          id: Date.now() + index,
          preview: URL.createObjectURL(file),
          status: 'pending'
        });
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    });

    return { validFiles, errors };
  }, [maxFiles]);

  const handleFiles = useCallback((fileList) => {
    const { validFiles, errors } = handleFileValidation(fileList);

    if (errors.length > 0) {
      onError?.(errors.join('\n'));
      return;
    }

    setFiles(prev => {
      const newFiles = [...prev, ...validFiles].slice(0, maxFiles);
      return newFiles;
    });
  }, [handleFileValidation, maxFiles, onError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      return updated;
    });
    
    // Limpar URL de preview
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  }, [files]);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    const results = [];

    try {
      for (const fileObj of files) {
        if (fileObj.status !== 'pending') continue;

        const progressCallback = (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileObj.id]: progress
          }));
        };

        try {
          let result;
          
          switch (uploadType) {
            case 'profile':
              if (!userId) throw new Error('userId é obrigatório para upload de perfil');
              result = await imageUploadService.uploadProfilePhoto(
                userId, 
                fileObj.file, 
                progressCallback
              );
              break;
              
            case 'question':
              const questionId = folder; // Para questões, folder será o questionId
              result = await imageUploadService.uploadQuestionImage(
                questionId, 
                fileObj.file, 
                progressCallback
              );
              break;
              
            default:
              result = await imageUploadService.uploadImage(
                fileObj.file,
                folder,
                userId,
                progressCallback
              );
              break;
          }

          // Atualizar status do arquivo
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'completed', result }
              : f
          ));

          results.push({ fileId: fileObj.id, ...result });
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          ));
          onError?.(error.message);
        }
      }

      if (results.length > 0) {
        onUpload?.(maxFiles === 1 ? results[0] : results);
      }
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [files, uploadType, userId, folder, maxFiles, onUpload, onError]);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setUploadProgress({});
  }, [files]);

  return (
    <div className={`w-full ${className}`}>
      {/* Área de Drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600">
          Clique para selecionar ou arraste {maxFiles > 1 ? 'imagens' : 'uma imagem'} aqui
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, GIF até 50MB
        </p>
      </div>

      {/* Preview dos arquivos */}
      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((fileObj) => (
            <div key={fileObj.id} className="flex items-center gap-3 p-3 border rounded-lg">
              {/* Thumbnail */}
              <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-100">
                <img
                  src={fileObj.preview}
                  alt={fileObj.file.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info do arquivo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileObj.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                
                {/* Progress bar */}
                {uploadProgress[fileObj.id] && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress[fileObj.id]}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadProgress[fileObj.id]}%
                    </p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {fileObj.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {fileObj.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {fileObj.status === 'pending' && !uploading && (
                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botões de ação */}
      {files.length > 0 && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={uploadFiles}
            disabled={uploading || files.every(f => f.status !== 'pending')}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Enviando...' : 'Enviar Imagens'}
          </button>
          
          <button
            onClick={clearFiles}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 