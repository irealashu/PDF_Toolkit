import React, { useState, useRef, useEffect } from 'react';
import {
  Crop as CropIcon,
  FolderOpen,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cropPdf, renderPdfThumbnail, downloadFile, fileToUint8Array } from '../../utils/pdfHelpers';

interface CropPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const CropPage: React.FC<CropPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageThumbnail, setPageThumbnail] = useState<string | null>(null);

  const [top, setTop] = useState<number>(36);
  const [bottom, setBottom] = useState<number>(36);
  const [left, setLeft] = useState<number>(36);
  const [right, setRight] = useState<number>(36);
  const [applyToAll, setApplyToAll] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load document preview when file selected
  useEffect(() => {
    if (!file) {
      setPageThumbnail(null);
      setPageCount(0);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const bytes = await fileToUint8Array(file);
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const count = doc.getPageCount();
        if (!isMounted) return;
        setPageCount(count);
        setCurrentPage(1);

        const thumb = await renderPdfThumbnail(bytes, 0, 0.6);
        if (isMounted) setPageThumbnail(thumb);
      } catch (err) {
        console.error('Thumbnail load failed:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Load thumbnail when currentPage changes
  useEffect(() => {
    if (!file || currentPage < 1) return;
    let isMounted = true;

    (async () => {
      try {
        const bytes = await fileToUint8Array(file);
        const thumb = await renderPdfThumbnail(bytes, currentPage - 1, 0.6);
        if (isMounted) setPageThumbnail(thumb);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentPage, file]);

  const handleApplyCrop = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF to crop', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Cropping PDF margins...', 20);

      const croppedBytes = await cropPdf(
        file,
        { top, right, bottom, left },
        applyToAll,
        currentPage - 1,
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(croppedBytes, `cropped_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', 'PDF margins cropped and trimmed successfully');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Crop failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPreset = (t: number, r: number, b: number, l: number) => {
    setTop(t);
    setRight(r);
    setBottom(b);
    setLeft(l);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <CropIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Crop & Margin Trimmer</h2>
          <p className="text-xs text-slate-500">
            Trim margins, remove white borders, headers, or footers from document pages with precision.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left 2 Cols: Controls & Inputs */}
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
                placeholder="Choose PDF file..."
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
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <span>Total Pages: {pageCount}</span>
              </div>
            )}
          </div>

          {/* Margin Adjusters */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Trim Margins (in points / pt)
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset(0, 0, 0, 0)}
                  className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-slate-600 py-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(36, 36, 36, 36)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
              >
                0.5 inch (36 pt)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(72, 72, 72, 72)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
              >
                1.0 inch (72 pt)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(40, 10, 40, 10)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
              >
                Header/Footer Strip
              </button>
            </div>

            {/* 4 Margin Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Top Trim: {top} pt
                </label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={top}
                  onChange={(e) => setTop(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5"
                />
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={top}
                  onChange={(e) => setTop(parseInt(e.target.value))}
                  className="w-full mt-1 accent-[#2780e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bottom Trim: {bottom} pt
                </label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={bottom}
                  onChange={(e) => setBottom(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5"
                />
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={bottom}
                  onChange={(e) => setBottom(parseInt(e.target.value))}
                  className="w-full mt-1 accent-[#2780e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Left Trim: {left} pt
                </label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={left}
                  onChange={(e) => setLeft(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5"
                />
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={left}
                  onChange={(e) => setLeft(parseInt(e.target.value))}
                  className="w-full mt-1 accent-[#2780e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Right Trim: {right} pt
                </label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={right}
                  onChange={(e) => setRight(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5"
                />
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={right}
                  onChange={(e) => setRight(parseInt(e.target.value))}
                  className="w-full mt-1 accent-[#2780e3]"
                />
              </div>
            </div>

            {/* Scope selection */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Apply Crop Scope:
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="cropScope"
                    checked={applyToAll}
                    onChange={() => setApplyToAll(true)}
                    className="accent-[#2780e3]"
                  />
                  <span>Apply to all pages in document</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="cropScope"
                    checked={!applyToAll}
                    onChange={() => setApplyToAll(false)}
                    className="accent-[#2780e3]"
                  />
                  <span>Only page {currentPage}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Crop Preview
              </h3>
              {pageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono">
                    {currentPage}/{pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= pageCount}
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Simulated Crop Boundary Canvas */}
            <div className="relative w-full aspect-[1/1.3] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
              {pageThumbnail ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <img
                    src={pageThumbnail}
                    alt="Page thumbnail"
                    className="max-h-full max-w-full object-contain shadow-xs border border-slate-300"
                  />
                  {/* Crop overlay shaded borders */}
                  <div
                    className="absolute top-0 left-0 right-0 bg-red-500/20 border-b border-red-500"
                    style={{ height: `${Math.min(45, (top / 200) * 100)}%` }}
                  ></div>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-red-500/20 border-t border-red-500"
                    style={{ height: `${Math.min(45, (bottom / 200) * 100)}%` }}
                  ></div>
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-red-500/20 border-r border-red-500"
                    style={{ width: `${Math.min(45, (left / 200) * 100)}%` }}
                  ></div>
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-red-500/20 border-l border-red-500"
                    style={{ width: `${Math.min(45, (right / 200) * 100)}%` }}
                  ></div>
                </div>
              ) : (
                <div className="text-center p-4 text-slate-400">
                  <CropIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  <span className="text-xs">No PDF loaded</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-[10px] text-slate-500 text-center">
              Red shaded areas indicate margins that will be cropped away.
            </div>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleApplyCrop}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Trimming PDF...' : 'Trim Margins & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
