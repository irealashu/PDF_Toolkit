import React, { useState, useRef } from 'react';
import {
  Layers,
  FolderOpen,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { flattenPdf, downloadFile } from '../../utils/pdfHelpers';

interface FlattenPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const FlattenPage: React.FC<FlattenPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFlatten = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document first', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Flattening interactive forms and annotations...', 25);

      const flattenedBytes = await flattenPdf(file, (pct, status) => {
        onSetStatus(status, pct);
      });

      downloadFile(flattenedBytes, `flattened_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', 'PDF forms and annotations successfully flattened');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Flatten failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Form & Annotation Flattening</h2>
          <p className="text-xs text-slate-500">
            Permanently bake interactive PDF AcroForms, text boxes, and annotations into the native page stream.
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
                placeholder="Select PDF with forms or comments..."
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

          {/* Detailed Info Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#2780e3]" />
              <span>What Happens During Flattening?</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                When a PDF has fillable form inputs, standard viewers render them as an interactive layer over the page. Flattening converts those input entries into permanent, uneditable graphic vector streams.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-xs text-slate-800 block mb-1">Before Flattening</span>
                <span className="text-[11px] text-slate-500 block">
                  Interactive text fields can still be edited, cleared, or altered by anyone opening the file.
                </span>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/70">
                <span className="font-bold text-xs text-blue-900 block mb-1">After Flattening</span>
                <span className="text-[11px] text-blue-700 block">
                  Text entries are permanently etched into the PDF background. The document is strictly read-only.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Benefits & Action */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Key Advantages</span>
            </h3>

            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Renders identically across all mobile devices, web browsers, and printers.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Prevents unauthorized alteration of submitted contracts or completed forms.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>Removes potential script exploits and orphaned widget streams.</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleFlatten}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Flattening...' : 'Flatten Form & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
