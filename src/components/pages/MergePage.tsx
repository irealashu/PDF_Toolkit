import React, { useState, useRef } from 'react';
import {
  FilePlus,
  Trash2,
  Combine,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { mergePdfs, downloadFile } from '../../utils/pdfHelpers';

interface MergePageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const MergePage: React.FC<MergePageProps> = ({ onNotify, onSetStatus }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    );
    if (selected.length === 0) return;

    setFiles((prev) => [...prev, ...selected]);
    onNotify('Files Added', `Added ${selected.length} PDF file(s) to merge list`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    setFiles([]);
    onSetStatus('Ready', 0);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;

    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      onNotify('Notice', 'Please add at least 2 PDF files to merge', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Starting PDF merge...', 5);

      const mergedBytes = await mergePdfs(files, (pct, status) => {
        onSetStatus(status, pct);
      });

      downloadFile(mergedBytes, 'merged_document.pdf');
      onSetStatus('Ready', 100);
      onNotify('Success', 'Merged PDFs successfully created and downloaded');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Merge failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleAddFiles}
      />

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Combine className="w-6 h-6 text-[#2780e3]" />
            Merge Documents (PDFs Only)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Combine multiple PDF files into a single unified document with custom sequencing.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg my-4 flex flex-col overflow-hidden shadow-xs">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Files in merge sequence ({files.length})</span>
          <span>Order</span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <FileText className="w-12 h-12 stroke-1 mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-600">No PDF files added</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Add PDFs&quot; below to add documents to combine
              </p>
            </div>
          ) : (
            files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200 rounded-lg hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
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
                    disabled={idx === files.length - 1}
                    onClick={() => moveItem(idx, 'down')}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                    title="Remove File"
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
            <FilePlus className="w-4 h-4" />
            <span>Add PDFs</span>
          </button>

          <button
            onClick={handleClear}
            disabled={files.length === 0 || isProcessing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear List</span>
          </button>
        </div>

        <button
          onClick={handleMerge}
          disabled={files.length < 2 || isProcessing}
          className="flex items-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-5 py-2.5 rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
        >
          <Combine className="w-4 h-4" />
          <span>Merge Now</span>
        </button>
      </div>
    </div>
  );
};
