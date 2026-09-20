import React, { useState, useRef } from 'react';
import {
  Stamp,
  FolderOpen,
  Image as ImageIcon,
  Type,
  FileText,
  Sparkles,
} from 'lucide-react';
import { watermarkPdf, downloadFile } from '../../utils/pdfHelpers';

interface WatermarkPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const WatermarkPage: React.FC<WatermarkPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<number>(45);
  const [opacity, setOpacity] = useState<number>(0.3);
  const [isProcessing, setIsProcessing] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleApplyWatermark = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a source PDF document', 'danger');
      return;
    }

    if (watermarkType === 'image' && !imageFile) {
      onNotify('Notice', 'Please select a watermark image', 'danger');
      return;
    }

    if (watermarkType === 'text' && !watermarkText.trim()) {
      onNotify('Notice', 'Please enter watermark text', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Applying watermark across all pages...', 20);

      const watermarkedBytes = await watermarkPdf(
        file,
        {
          type: watermarkType,
          text: watermarkText,
          imageFile: imageFile || undefined,
          angleDegrees: angle,
          opacity: opacity,
        },
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(watermarkedBytes, `watermarked_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', 'Watermark successfully applied to PDF');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Watermark failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <input
        type="file"
        ref={pdfInputRef}
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
      <input
        type="file"
        ref={imageInputRef}
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setImageFile(f);
        }}
      />

      <div className="pb-4 border-b border-slate-200 mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Stamp className="w-6 h-6 text-[#2780e3]" />
          Watermark
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Add custom diagonal text or brand logos with transparency over each page.
        </p>
      </div>

      <div className="space-y-6">
        {/* Source File */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-3">
            Source PDF
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-[#2780e3] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Select PDF</span>
            </button>
            <div className="truncate">
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">{file.name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">No file selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Watermark Type Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setWatermarkType('text')}
              className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                watermarkType === 'text'
                  ? 'bg-white text-[#2780e3] border-b-2 border-[#2780e3]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text Watermark</span>
            </button>
            <button
              onClick={() => setWatermarkType('image')}
              className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                watermarkType === 'image'
                  ? 'bg-white text-[#2780e3] border-b-2 border-[#2780e3]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image Watermark</span>
            </button>
          </div>

          <div className="p-5">
            {watermarkType === 'text' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Watermark Text:
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL or DRAFT"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2780e3] focus:bg-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Watermark Image (PNG/JPG):
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2 rounded text-xs font-semibold transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Choose Image</span>
                  </button>
                  <span className="text-xs text-slate-600 font-medium truncate">
                    {imageFile ? imageFile.name : 'No image chosen'}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rotation Angle: <span className="font-mono text-blue-600">{angle}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-[#2780e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opacity: <span className="font-mono text-blue-600">{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#2780e3]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleApplyWatermark}
            disabled={!file || isProcessing}
            className="flex items-center justify-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Watermark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
