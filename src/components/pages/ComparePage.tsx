import React, { useState, useRef, useEffect } from 'react';
import {
  GitCompare,
  FolderOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  SplitSquareVertical,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { fileToUint8Array } from '../../utils/pdfHelpers';

interface ComparePageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({ onNotify, onSetStatus }) => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [pageCountA, setPageCountA] = useState(0);
  const [pageCountB, setPageCountB] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff-overlay'>('side-by-side');
  const [scale, setScale] = useState(1.0);

  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  // Load Doc A info
  useEffect(() => {
    if (!fileA) {
      setPageCountA(0);
      return;
    }
    (async () => {
      try {
        const bytes = await fileToUint8Array(fileA);
        const task = pdfjsLib.getDocument({ data: bytes });
        const pdf = await task.promise;
        setPageCountA(pdf.numPages);
      } catch (e) {
        console.error('Doc A load failed:', e);
      }
    })();
  }, [fileA]);

  // Load Doc B info
  useEffect(() => {
    if (!fileB) {
      setPageCountB(0);
      return;
    }
    (async () => {
      try {
        const bytes = await fileToUint8Array(fileB);
        const task = pdfjsLib.getDocument({ data: bytes });
        const pdf = await task.promise;
        setPageCountB(pdf.numPages);
      } catch (e) {
        console.error('Doc B load failed:', e);
      }
    })();
  }, [fileB]);

  // Render pages when fileA, fileB, currentPage, scale or viewMode changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let canvasAEl: HTMLCanvasElement | null = null;
        let canvasBEl: HTMLCanvasElement | null = null;

        // Render Doc A
        if (fileA && currentPage <= pageCountA) {
          const bytesA = await fileToUint8Array(fileA);
          const pdfA = await pdfjsLib.getDocument({ data: bytesA }).promise;
          const pageA = await pdfA.getPage(currentPage);
          const viewportA = pageA.getViewport({ scale: scale * 1.5 });

          const tempCanvasA = document.createElement('canvas');
          tempCanvasA.width = viewportA.width;
          tempCanvasA.height = viewportA.height;
          const ctxA = tempCanvasA.getContext('2d')!;
          ctxA.fillStyle = '#ffffff';
          ctxA.fillRect(0, 0, tempCanvasA.width, tempCanvasA.height);
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
          canvasAEl = tempCanvasA;

          if (canvasARef.current && isMounted) {
            canvasARef.current.width = viewportA.width;
            canvasARef.current.height = viewportA.height;
            const targetCtxA = canvasARef.current.getContext('2d')!;
            targetCtxA.drawImage(tempCanvasA, 0, 0);
          }
        }

        // Render Doc B
        if (fileB && currentPage <= pageCountB) {
          const bytesB = await fileToUint8Array(fileB);
          const pdfB = await pdfjsLib.getDocument({ data: bytesB }).promise;
          const pageB = await pdfB.getPage(currentPage);
          const viewportB = pageB.getViewport({ scale: scale * 1.5 });

          const tempCanvasB = document.createElement('canvas');
          tempCanvasB.width = viewportB.width;
          tempCanvasB.height = viewportB.height;
          const ctxB = tempCanvasB.getContext('2d')!;
          ctxB.fillStyle = '#ffffff';
          ctxB.fillRect(0, 0, tempCanvasB.width, tempCanvasB.height);
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
          canvasBEl = tempCanvasB;

          if (canvasBRef.current && isMounted) {
            canvasBRef.current.width = viewportB.width;
            canvasBRef.current.height = viewportB.height;
            const targetCtxB = canvasBRef.current.getContext('2d')!;
            targetCtxB.drawImage(tempCanvasB, 0, 0);
          }
        }

        // Render Diff Overlay if both documents present and viewMode is diff-overlay
        if (canvasAEl && canvasBEl && canvasDiffRef.current && isMounted) {
          const diffCanvas = canvasDiffRef.current;
          const w = Math.max(canvasAEl.width, canvasBEl.width);
          const h = Math.max(canvasAEl.height, canvasBEl.height);
          diffCanvas.width = w;
          diffCanvas.height = h;
          const diffCtx = diffCanvas.getContext('2d')!;

          // Draw Doc A in subtle tint
          diffCtx.globalCompositeOperation = 'source-over';
          diffCtx.drawImage(canvasAEl, 0, 0);

          // Draw Doc B using difference blend mode to highlight alterations
          diffCtx.globalCompositeOperation = 'difference';
          diffCtx.drawImage(canvasBEl, 0, 0);

          // Invert back to legible paper background
          diffCtx.globalCompositeOperation = 'difference';
          diffCtx.fillStyle = '#ffffff';
          diffCtx.fillRect(0, 0, w, h);
        }
      } catch (err) {
        console.error('Comparison render error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fileA, fileB, currentPage, pageCountA, pageCountB, scale, viewMode]);

  const maxPages = Math.max(pageCountA, pageCountB) || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">PDF Compare / Visual Diff</h2>
            <p className="text-xs text-slate-500">
              Inspect revisions side-by-side or highlight pixel differences between two document versions.
            </p>
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-[#2780e3] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff-overlay')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium ${
                viewMode === 'diff-overlay'
                  ? 'bg-white text-[#2780e3] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Difference Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-medium px-1 text-slate-700">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Selectors Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document A */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Document A (Original)
            </span>
            {pageCountA > 0 && (
              <span className="text-[11px] text-slate-500 font-mono">{pageCountA} pages</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={fileA ? fileA.name : ''}
              placeholder="Select original PDF..."
              className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
            />
            <input
              ref={fileInputARef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) setFileA(e.target.files[0]);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputARef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse A</span>
            </button>
          </div>
        </div>

        {/* Document B */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Document B (Modified)
            </span>
            {pageCountB > 0 && (
              <span className="text-[11px] text-slate-500 font-mono">{pageCountB} pages</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={fileB ? fileB.name : ''}
              placeholder="Select revised PDF..."
              className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
            />
            <input
              ref={fileInputBRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) setFileB(e.target.files[0]);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputBRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse B</span>
            </button>
          </div>
        </div>
      </div>

      {/* Page Navigation Bar */}
      {(fileA || fileB) && (
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous Page</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-800">
            Page {currentPage} of {maxPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= maxPages}
            onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold disabled:opacity-40"
          >
            <span>Next Page</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 min-h-[480px] overflow-auto">
        {viewMode === 'side-by-side' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Canvas Doc A */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-slate-700 mb-2">Original (Document A)</div>
              <div className="bg-white shadow-md border border-slate-300 rounded overflow-hidden max-w-full">
                {fileA ? (
                  <canvas ref={canvasARef} className="block max-w-full h-auto" />
                ) : (
                  <div className="w-72 h-96 flex items-center justify-center text-xs text-slate-400">
                    Upload Document A
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Doc B */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-slate-700 mb-2">Modified (Document B)</div>
              <div className="bg-white shadow-md border border-slate-300 rounded overflow-hidden max-w-full">
                {fileB ? (
                  <canvas ref={canvasBRef} className="block max-w-full h-auto" />
                ) : (
                  <div className="w-72 h-96 flex items-center justify-center text-xs text-slate-400">
                    Upload Document B
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Difference Overlay */
          <div className="flex flex-col items-center">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-black"></span>
              <span>Difference Map (Identical pixels appear pure white; altered lines show high contrast)</span>
            </div>
            <div className="bg-white shadow-md border border-slate-300 rounded overflow-hidden max-w-full">
              {fileA && fileB ? (
                <canvas ref={canvasDiffRef} className="block max-w-full h-auto" />
              ) : (
                <div className="w-96 h-96 flex items-center justify-center text-xs text-slate-400 text-center p-6">
                  Please select both Document A and Document B to generate the Difference Overlay.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
