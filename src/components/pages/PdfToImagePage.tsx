import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  FolderOpen,
  FileText,
  Sparkles,
  Download,
  Archive,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { convertPdfToImages, downloadFile, downloadImagesZip } from '../../utils/pdfHelpers';

interface PdfToImagePageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const PdfToImagePage: React.FC<PdfToImagePageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [scale, setScale] = useState<number>(2.0); // 2x default for crisp image output
  const [quality, setQuality] = useState<number>(0.92);

  const [renderedImages, setRenderedImages] = useState<
    { pageNum: number; dataUrl: string; blob: Blob }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConvert = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      setRenderedImages([]);
      onSetStatus('Converting PDF pages to images...', 10);

      const images = await convertPdfToImages(
        file,
        {
          format,
          scale,
          quality,
        },
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      setRenderedImages(images);
      onSetStatus('Ready', 100);
      onNotify('Success', `Converted ${images.length} pages into ${format.toUpperCase()} images`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Image conversion failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (img: { pageNum: number; blob: Blob }) => {
    const ext = format === 'png' ? 'png' : 'jpg';
    const base = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    downloadFile(img.blob, `${base}_page_${img.pageNum}.${ext}`, format === 'png' ? 'image/png' : 'image/jpeg');
  };

  const handleDownloadZip = async () => {
    if (!file || renderedImages.length === 0) return;
    try {
      onSetStatus('Packaging ZIP archive...', 50);
      const base = file.name.replace(/\.pdf$/i, '');
      await downloadImagesZip(renderedImages, base, format);
      onSetStatus('Ready', 100);
      onNotify('Success', 'Downloaded ZIP archive of all pages');
    } catch (err: any) {
      onNotify('Error', `Failed to create ZIP: ${err.message || err}`, 'danger');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <ImageIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">PDF to Images (PNG / JPEG)</h2>
          <p className="text-xs text-slate-500">
            Convert every PDF page into crisp high-resolution images. Download individual slides or export all as a ZIP package.
          </p>
        </div>
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Source PDF
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={file ? file.name : ''}
              placeholder="Select PDF document..."
              className="flex-1 text-xs border border-slate-300 rounded px-3 py-2 bg-slate-50 text-slate-700 focus:outline-hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setRenderedImages([]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse</span>
            </button>
          </div>
          {file && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            2. Output Format & Resolution
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold border ${
                  format === 'png'
                    ? 'bg-blue-50 border-[#2780e3] text-[#2780e3]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                PNG (Lossless)
              </button>
              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold border ${
                  format === 'jpeg'
                    ? 'bg-blue-50 border-[#2780e3] text-[#2780e3]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                JPEG (Compact)
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Quality Scale:</span>
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              >
                <option value={1.0}>1.0x (Standard Web)</option>
                <option value={1.5}>1.5x (Medium Crisp)</option>
                <option value={2.0}>2.0x (High-Res 150 DPI)</option>
                <option value={3.0}>3.0x (Ultra 300 DPI)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Conversion
            </label>
            <p className="text-xs text-slate-500">
              Renders all document pages into standalone image files using hardware-accelerated Canvas.
            </p>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleConvert}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs shadow-sm transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Converting Pages...' : 'Convert to Images'}</span>
          </button>
        </div>
      </div>

      {/* Rendered Image Gallery */}
      {renderedImages.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Rendered Pages ({renderedImages.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2780e3] hover:bg-blue-600 text-white text-xs font-bold rounded shadow-xs transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download All as ZIP</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {renderedImages.map((img) => (
              <div
                key={img.pageNum}
                className="group border border-slate-200 hover:border-[#2780e3] rounded-lg p-2 bg-slate-50 flex flex-col items-center gap-2 transition-all shadow-2xs hover:shadow-xs"
              >
                <div
                  className="relative w-full aspect-[1/1.3] bg-white rounded border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => setPreviewImage(img.dataUrl)}
                >
                  <img
                    src={img.dataUrl}
                    alt={`Page ${img.pageNum}`}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>

                <div className="w-full flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-slate-700">Page {img.pageNum}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(img)}
                    title="Download page image"
                    className="p-1 rounded text-[#2780e3] hover:bg-blue-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Full Modal Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-xl shadow-2xl overflow-auto">
            <img src={previewImage} alt="Preview" className="max-h-[85vh] w-auto object-contain mx-auto" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full hover:bg-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
