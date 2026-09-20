import React, { useState, useRef } from 'react';
import {
  Minimize2,
  FolderOpen,
  FileText,
  Zap,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { compressPdf, downloadFile } from '../../utils/pdfHelpers';

interface CompressPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const CompressPage: React.FC<CompressPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'standard' | 'max'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultStats, setResultStats] = useState<{
    originalSize: number;
    newSize: number;
    savingsPercent: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResultStats(null);
    }
  };

  const handleCompress = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF file first', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Analyzing and compressing PDF...', 20);

      const res = await compressPdf(file, mode, (pct, status) => {
        onSetStatus(status, pct);
      });

      setResultStats({
        originalSize: res.originalSize,
        newSize: res.newSize,
        savingsPercent: res.savingsPercent,
      });

      downloadFile(res.bytes, `compressed_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify(
        'Optimization Complete',
        `File reduced from ${(res.originalSize / 1024).toFixed(1)} KB to ${(res.newSize / 1024).toFixed(1)} KB (${res.savingsPercent}% saved)`
      );
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Optimization failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleSelectFile}
      />

      <div className="pb-4 border-b border-slate-200 mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Minimize2 className="w-6 h-6 text-[#2780e3]" />
          Compress PDF
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Reduce PDF file sizes by garbage-collecting orphaned objects and compressing internal streams.
        </p>
      </div>

      <div className="space-y-6">
        {/* Source File */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-3">
            Input File
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
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
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">No file selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Compression Settings */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-3">
            Optimization Level
          </label>
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                mode === 'standard'
                  ? 'bg-blue-50/60 border-[#2780e3]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="compression-mode"
                checked={mode === 'standard'}
                onChange={() => setMode('standard')}
                className="mt-0.5 accent-[#2780e3]"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Standard Compression (Balanced)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Safe object stream compression with optimal visual fidelity preservation.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                mode === 'max'
                  ? 'bg-blue-50/60 border-[#2780e3]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="compression-mode"
                checked={mode === 'max'}
                onChange={() => setMode('max')}
                className="mt-0.5 accent-[#2780e3]"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Max Compression (Aggressive)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Deep clean of cross-reference tables, deduplication, and compressed font dictionaries.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Result Statistics */}
        {resultStats && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Optimization Successful</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Original: {(resultStats.originalSize / 1024).toFixed(1)} KB &rarr; Compressed:{' '}
                  {(resultStats.newSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <Percent className="w-3.5 h-3.5" />
              <span>{resultStats.savingsPercent}% Saved</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            onClick={handleCompress}
            disabled={!file || isProcessing}
            className="flex items-center justify-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>Optimize Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
