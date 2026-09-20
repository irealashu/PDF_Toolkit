import React, { useState, useRef } from 'react';
import {
  Grid,
  FolderOpen,
  FileText,
  Sparkles,
  Layers,
  LayoutTemplate,
  Square,
  CheckSquare,
} from 'lucide-react';
import { generateNUpPdf, downloadFile } from '../../utils/pdfHelpers';

interface NUpPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const NUpPage: React.FC<NUpPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [layout, setLayout] = useState<'2-up' | '4-up' | '6-up'>('2-up');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [drawBorder, setDrawBorder] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a source PDF document', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Generating N-Up handout sheets...', 15);

      const nUpBytes = await generateNUpPdf(
        file,
        {
          layout,
          orientation,
          drawBorder,
        },
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(nUpBytes, `nup_${layout}_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', `${layout.toUpperCase()} Handout PDF generated successfully`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `N-Up generation failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const getGridPreview = () => {
    let slots = 2;
    if (layout === '4-up') slots = 4;
    if (layout === '6-up') slots = 6;

    let colsClass = 'grid-cols-2';
    if (layout === '2-up') {
      colsClass = orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-1';
    } else if (layout === '4-up') {
      colsClass = 'grid-cols-2';
    } else if (layout === '6-up') {
      colsClass = orientation === 'landscape' ? 'grid-cols-3' : 'grid-cols-2';
    }

    return (
      <div
        className={`w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-3 grid ${colsClass} gap-2 shadow-inner ${
          orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
        }`}
      >
        {Array.from({ length: slots }).map((_, idx) => (
          <div
            key={idx}
            className={`bg-white rounded flex flex-col items-center justify-center p-2 shadow-xs transition-all ${
              drawBorder ? 'border border-slate-400' : 'border border-slate-200'
            }`}
          >
            <div className="w-full flex-1 flex flex-col justify-center items-center gap-1 opacity-40">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold text-slate-700">Slide {idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <Grid className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">N-Up / Multiple Pages Per Sheet</h2>
          <p className="text-xs text-slate-500">
            Combine multiple PDF presentation slides or document pages onto single printed handout sheets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left 2 Cols */}
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
                placeholder="Choose PDF file to arrange..."
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
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}
          </div>

          {/* Grid Layout Configuration */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <LayoutTemplate className="w-4 h-4 text-[#2780e3]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Arrangement Settings
              </h3>
            </div>

            {/* Layout Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pages Per Sheet
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '2-up', label: '2-Up', desc: '2 pages per sheet' },
                  { id: '4-up', label: '4-Up', desc: '2x2 grid (4 pages)' },
                  { id: '6-up', label: '6-Up', desc: '2x3 grid (6 pages)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayout(item.id as any)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      layout === item.id
                        ? 'border-[#2780e3] bg-blue-50/80 text-[#2780e3] shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sheet Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Sheet Orientation
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 py-2 px-3 rounded text-xs font-semibold border ${
                      orientation === 'landscape'
                        ? 'bg-blue-50 border-[#2780e3] text-[#2780e3]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 py-2 px-3 rounded text-xs font-semibold border ${
                      orientation === 'portrait'
                        ? 'bg-blue-50 border-[#2780e3] text-[#2780e3]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Page Framing
                </label>
                <button
                  type="button"
                  onClick={() => setDrawBorder(!drawBorder)}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold border ${
                    drawBorder
                      ? 'bg-blue-50 border-[#2780e3] text-[#2780e3]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {drawBorder ? (
                    <CheckSquare className="w-4 h-4 text-[#2780e3]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Outline Frame Border</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Sheet Preview & Action */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
              Sheet Layout Preview
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Standard A4 sheet in {orientation} with {layout} distribution:
            </p>

            {getGridPreview()}
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleGenerate}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Generating...' : 'Create Handout & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
