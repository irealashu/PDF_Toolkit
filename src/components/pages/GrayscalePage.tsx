import React, { useState, useRef } from 'react';
import {
  SunMedium,
  FolderOpen,
  FileText,
  Sparkles,
  Contrast,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { convertToGrayscalePdf, downloadFile } from '../../utils/pdfHelpers';

interface GrayscalePageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const GrayscalePage: React.FC<GrayscalePageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'grayscale' | 'monochrome'>('grayscale');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConvert = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document first', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Converting PDF to grayscale...', 15);

      const grayBytes = await convertToGrayscalePdf(
        file,
        mode,
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(grayBytes, `${mode}_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', `Document converted to ${mode === 'grayscale' ? 'Grayscale' : 'Monochrome B&W'}`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Grayscale conversion failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <SunMedium className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Grayscale / Black & White Converter</h2>
          <p className="text-xs text-slate-500">
            Convert color PDFs to clean grayscale or high-contrast monochrome black-and-white to save printer ink and standardize documents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          {/* File Picker */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Source PDF Document
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={file ? file.name : ''}
                placeholder="Select color PDF..."
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

          {/* Color Mode Options */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Color Profile
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('grayscale')}
                className={`p-4 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  mode === 'grayscale'
                    ? 'border-[#2780e3] bg-blue-50/70 text-[#2780e3] shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <SunMedium className="w-4 h-4" />
                    <span>True Grayscale</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Preserves continuous tonal shading with 256 shades of gray. Best for photographs, diagrams, and illustrations.
                  </p>
                </div>
                <div className="mt-3 h-3 w-full rounded bg-linear-to-r from-black via-gray-400 to-white border border-slate-300"></div>
              </button>

              <button
                type="button"
                onClick={() => setMode('monochrome')}
                className={`p-4 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  mode === 'monochrome'
                    ? 'border-[#2780e3] bg-blue-50/70 text-[#2780e3] shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Contrast className="w-4 h-4" />
                    <span>Monochrome (Pure B&W)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Binary high-contrast threshold (100% black text on pure white paper). Ideal for forms, text reports, and laser printers.
                  </p>
                </div>
                <div className="mt-3 h-3 w-full rounded flex border border-slate-300 overflow-hidden">
                  <div className="w-1/2 bg-black"></div>
                  <div className="w-1/2 bg-white"></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Benefits info card & action */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-[#2780e3]" />
              <span>Why Convert to Grayscale?</span>
            </h3>

            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Prevents expensive color cartridge drainage when printing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Standardizes official filings, court documents, and tax forms.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Eliminates color banding and low-contrast background tints.</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleConvert}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Converting Colors...' : 'Convert & Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
