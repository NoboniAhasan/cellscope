import React, { useState, useRef } from 'react';
import { ApiError } from '../../types';

interface ImageUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function ImageUploadZone({ onUpload, isUploading }: ImageUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setErrorMsg(null);

    // Validate size (max 20 MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB maximum limit.`);
      return;
    }

    // Validate extension
    const validExtensions = ['.png', '.jpg', '.jpeg', '.tif', '.tiff'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setErrorMsg('Invalid file format. Only PNG, JPEG, and TIFF microscopy images are supported.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message || 'Image upload failed. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">✕</span>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-800 font-bold px-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
          dragOver
            ? 'border-teal-500 bg-teal-50/50'
            : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/80 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shadow-sm">
          📸
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {isUploading ? 'Uploading and validating image...' : 'Click to upload or drag & drop microscopy image'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports PNG, JPEG, TIFF up to 20 MB
          </p>
        </div>

        <button
          type="button"
          disabled={isUploading}
          className="mt-2 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition"
        >
          {isUploading ? 'Processing...' : 'Browse Local Files'}
        </button>
      </div>
    </div>
  );
}
