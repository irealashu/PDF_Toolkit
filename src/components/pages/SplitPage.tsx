import React, { useState, useRef } from 'react';
import {
  Scissors,
  FolderOpen,
  FileText,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { splitPdfRanges, downloadFile, fileToUint8Array } from '../../utils/pdfHelpers';

interface SplitPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const SplitPage: React.FC<SplitPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState<string>('1-3');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      onSetStatus(`Analyzing ${selected.name}...`, 30);
      const bytes = await fileToUint8Array(selected);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();

      setFile(selected);
      setTotalPages(count);
      setRangeInput(count > 1 ? `1-${Math.min(3, count)}` : '1');
      onSetStatus('Ready', 100);
      onNotify('File Loaded', `${selected.name} has ${count} pages`);
    } catch (err: any) {
      console.error(err);
      onNotify('Error', `Failed to open PDF: ${err.message || err}`, 'danger');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExtract = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF file first', 'danger');
      return;
    }

    if (!rangeInput.trim()) {
      onNotify('Notice', 'Please enter a valid page range (e.g. 1-5, 8)', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Extracting page ranges...', 20);

      const results = await splitPdfRanges(file, rangeInput, (pct, status) => {
        onSetStatus(status, pct);
      });

      // Download all extracted PDFs
      for (const res of results) {
        downloadFile(res.bytes, res.filename);
      }

      onSetStatus('Ready', 100);
      onNotify('Success', `Successfully extracted ${results.length} PDF range file(s)`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Extraction failed: ${err.message || err}`, 'danger');
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
          <Scissors className="w-6 h-6 text-[#2780e3]" />
          Split / Extract Pages
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Extract specific pages or custom page ranges into individual PDF documents.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Input File */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-3">
            1. Select Source PDF
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
                  <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded">
                    {totalPages} pages
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">No file selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Ranges */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-2">
            2. Page Ranges
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Specify comma-separated pages and ranges. Example:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">
              1-5, 8, 10-12
            </code>
          </p>

          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            disabled={!file || isProcessing}
            placeholder="e.g. 1-3, 5"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2780e3] focus:bg-white disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Each range item will generate its own dedicated PDF file (e.g.{' '}
              {file ? `${file.name.replace(/\.pdf$/i, '')}_pg_1-3.pdf` : 'split_pg_1-3.pdf'}).
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleExtract}
            disabled={!file || isProcessing}
            className="flex items-center justify-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Extract Pages</span>
          </button>
        </div>
      </div>
    </div>
  );
};
