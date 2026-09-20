import React, { useState, useRef } from 'react';
import {
  ImagePlus,
  Trash2,
  FileCheck,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
} from 'lucide-react';
import { convertImagesToPdf, downloadFile, fileToDataUrl } from '../../utils/pdfHelpers';

interface ImageToPdfPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

interface ImageItem {
  file: File;
  previewUrl: string;
}

export const ImageToPdfPage: React.FC<ImageToPdfPageProps> = ({ onNotify, onSetStatus }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    try {
      const items: ImageItem[] = [];
      for (const file of selected) {
        const previewUrl = await fileToDataUrl(file);
        items.push({ file, previewUrl });
      }

      setImages((prev) => [...prev, ...items]);
      onNotify('Images Added', `Added ${items.length} image(s) to convert`);
    } catch (err: any) {
      console.error(err);
      onNotify('Error', 'Failed to load image previews', 'danger');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setImages([]);
    onSetStatus('Ready', 0);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    try {
      setIsProcessing(true);
      onSetStatus('Starting image to PDF conversion...', 5);

      const files = images.map((im) => im.file);
      const pdfBytes = await convertImagesToPdf(files, (pct, status) => {
        onSetStatus(status, pct);
      });

      downloadFile(pdfBytes, 'images_combined.pdf');
      onSetStatus('Ready', 100);
      onNotify('Success', 'Images converted to PDF successfully');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Conversion failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={handleAddImages}
      />

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#2780e3]" />
            Image to PDF Converter
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert JPG, PNG, JPEG, and WebP images into a single combined PDF document.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg my-4 flex flex-col overflow-hidden shadow-xs">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Images in document sequence ({images.length})</span>
          <span>Order</span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ImageIcon className="w-12 h-12 stroke-1 mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-600">No images added</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Add Images&quot; below to import photos or graphics
              </p>
            </div>
          ) : (
            images.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Page {idx + 1} &bull; {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, 'up')}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === images.length - 1}
                    onClick={() => moveItem(idx, 'down')}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-[#2780e3] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Add Images</span>
          </button>

          <button
            onClick={handleClear}
            disabled={images.length === 0 || isProcessing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear List</span>
          </button>
        </div>

        <button
          onClick={handleConvert}
          disabled={images.length === 0 || isProcessing}
          className="flex items-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-5 py-2.5 rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          <span>Convert to PDF</span>
        </button>
      </div>
    </div>
  );
};
