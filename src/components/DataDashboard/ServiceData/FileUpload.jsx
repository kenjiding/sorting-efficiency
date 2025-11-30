import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';

const FileUpload = ({ 
  title, 
  description, 
  accept = '.xlsx,.xls',
  onFileUpload,
  uploadStatus,
  uploading
}) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    onFileUpload(file);
    event.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
      <div className="flex items-center justify-between mr-4">
        <div>
          <h4 className="text-md font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? '上传中...' : '选择文件'}
        </button>

        {uploadStatus && (
          <div className={`flex items-center gap-2 ${
            uploadStatus.type === 'success' ? 'text-green-600' : 
            uploadStatus.type === 'error' ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5" />}
            <span className="text-sm">{uploadStatus.message}</span>
            <button
              onClick={() => uploadStatus.onClose?.()}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

