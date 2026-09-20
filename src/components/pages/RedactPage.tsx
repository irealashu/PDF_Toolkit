import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import {
  EyeOff,
  FolderOpen,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Undo,
  ShieldAlert,
} from 'lucide-react';
import { redactPdf, RedactionBox, downloadFile, fileToUint8Array } from '../../utils/pdfHelpers';
import * as pdfjsLib from 'pdfjs-dist';

interface RedactPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const RedactPage: React.FC<RedactPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load document and render page on canvas
  useEffect(() => {
    if (!file) {
      setPageCount(0);
      setRedactions([]);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const bytes = await fileToUint8Array(file);
        const task = pdfjsLib.getDocument({ data: bytes });
        const pdf = await task.promise;
        if (!isMounted) return;
        setPageCount(pdf.numPages);
        setCurrentPage(1);
      } catch (e) {
        console.error('Failed to load PDF in Redact:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page onto canvas
  useEffect(() => {
    if (!file || currentPage < 1) return;
    let isMounted = true;

    (async () => {
      try {
        const bytes = await fileToUint8Array(file);
        const task = pdfjsLib.getDocument({ data: bytes });
        const pdf = await task.promise;
        const page = await pdf.getPage(currentPage);

        if (!canvasRef.current || !isMounted) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Render at crisp 1.5x scale
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
      } catch (e) {
        console.error('Error rendering page in Redact:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file, currentPage]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const w = Math.abs(curX - startPos.x);
    const h = Math.abs(curY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !containerRef.current) {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentBox(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    if (currentBox.w > 5 && currentBox.h > 5) {
      const newBox: RedactionBox = {
        id: `redact-${Date.now()}-${Math.random()}`,
        pageIndex: currentPage - 1,
        xPct: currentBox.x / rect.width,
        yPct: currentBox.y / rect.height,
        wPct: currentBox.w / rect.width,
        hPct: currentBox.h / rect.height,
      };
      setRedactions((prev) => [...prev, newBox]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const currentPageRedactions = redactions.filter((r) => r.pageIndex === currentPage - 1);

  const handleRemoveRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearCurrent = () => {
    setRedactions((prev) => prev.filter((r) => r.pageIndex !== currentPage - 1));
  };

  const handleApplyRedactions = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document', 'danger');
      return;
    }

    if (redactions.length === 0) {
      onNotify('Notice', 'Please draw at least one redaction box on the document', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Burning permanent redaction blackout boxes into PDF...', 20);

      const redactedBytes = await redactPdf(
        file,
        redactions,
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(redactedBytes, `redacted_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', `Applied ${redactions.length} permanent redactions`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Redaction failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <EyeOff className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Permanent Visual Redaction</h2>
          <p className="text-xs text-slate-500">
            Click and drag directly over sensitive text, numbers, or photos. Redactions are physically baked as solid black boxes into the PDF stream.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left 2 Cols: Interactive Canvas */}
        <div className="md:col-span-2 space-y-3">
          {/* File Picker Bar & Navigation */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Choose PDF</span>
              </button>
              {file && (
                <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                  {file.name}
                </span>
              )}
            </div>

            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-medium text-slate-700">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Interactive Document Workspace */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 overflow-auto flex justify-center min-h-[480px]">
            {file ? (
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="relative cursor-crosshair select-none bg-white shadow-md rounded border border-slate-300 inline-block"
              >
                <canvas ref={canvasRef} className="block max-w-full h-auto" />

                {/* Existing Redaction Boxes on this page */}
                {currentPageRedactions.map((box) => (
                  <div
                    key={box.id}
                    className="absolute bg-black border border-red-500 group"
                    style={{
                      left: `${box.xPct * 100}%`,
                      top: `${box.yPct * 100}%`,
                      width: `${box.wPct * 100}%`,
                      height: `${box.hPct * 100}%`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRedaction(box.id);
                      }}
                      className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Delete this redaction box"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Active drawing box preview */}
                {isDrawing && currentBox && (
                  <div
                    className="absolute bg-black/80 border-2 border-dashed border-red-400"
                    style={{
                      left: `${currentBox.x}px`,
                      top: `${currentBox.y}px`,
                      width: `${currentBox.w}px`,
                      height: `${currentBox.h}px`,
                    }}
                  ></div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                <EyeOff className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-600">No Document Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Upload a PDF document above to begin redacting private details with the drawing tool.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Redactions Manager & Security Banner */}
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs flex gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permanent Redaction: </span>
              Redacted areas are physically overwritten with solid ink. No underlying characters remain.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Redactions List ({redactions.length})
              </h3>
              {currentPageRedactions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-[11px] text-red-600 hover:underline flex items-center gap-1"
                >
                  <Undo className="w-3 h-3" />
                  <span>Clear Page {currentPage}</span>
                </button>
              )}
            </div>

            {redactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Click & drag on the document to place blackout redaction boxes.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {redactions.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-2 rounded text-xs border ${
                      r.pageIndex === currentPage - 1
                        ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>
                      Box #{idx + 1} on Page {r.pageIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRedaction(r.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!file || redactions.length === 0 || isProcessing}
            onClick={handleApplyRedactions}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || redactions.length === 0 || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Burning Redactions...' : 'Apply Redaction & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
