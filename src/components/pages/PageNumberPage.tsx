import React, { useState, useRef } from 'react';
import {
  Hash,
  FolderOpen,
  FileText,
  Sparkles,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { addPageNumbersToPdf, downloadFile } from '../../utils/pdfHelpers';

interface PageNumberPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const PageNumberPage: React.FC<PageNumberPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  >('bottom-center');
  const [format, setFormat] = useState<'page-x-of-y' | 'page-x' | 'x' | 'x-of-y' | 'roman'>('page-x-of-y');
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(10);
  const [color, setColor] = useState<string>('#333333');
  const [startPage, setStartPage] = useState<number>(1);
  const [startingNumber, setStartingNumber] = useState<number>(1);
  const [margin, setMargin] = useState<number>(25);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApply = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document first', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Adding page numbers...', 10);

      const resultBytes = await addPageNumbersToPdf(
        file,
        {
          position,
          format,
          prefix: prefix.trim(),
          suffix: suffix.trim(),
          fontSize,
          color,
          startPage,
          startingNumber,
          margin,
        },
        (pct, status) => {
          onSetStatus(status, pct);
        }
      );

      downloadFile(resultBytes, `numbered_${file.name}`);
      onSetStatus('Ready', 100);
      onNotify('Success', 'Page numbers applied successfully');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Failed to apply page numbers: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPreviewText = () => {
    const p = prefix ? `${prefix} ` : '';
    const s = suffix ? ` ${suffix}` : '';
    switch (format) {
      case 'page-x-of-y':
        return `${p}Page 1 of 12${s}`;
      case 'page-x':
        return `${p}Page 1${s}`;
      case 'x-of-y':
        return `${p}1 / 12${s}`;
      case 'roman':
        return `${p}i${s}`;
      case 'x':
      default:
        return `${p}1${s}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <Hash className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Add Page Numbers & Headers/Footers</h2>
          <p className="text-xs text-slate-500">
            Insert customizable page numbering, Roman numerals, or header/footer labels across document pages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: File selection & settings */}
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
                placeholder="Select a PDF file..."
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

          {/* Configuration Options */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sliders className="w-4 h-4 text-[#2780e3]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Placement & Formatting
              </h3>
            </div>

            {/* Position Matrix */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Page Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top-left', label: 'Top Left', icon: AlignLeft },
                  { id: 'top-center', label: 'Top Center', icon: AlignCenter },
                  { id: 'top-right', label: 'Top Right', icon: AlignRight },
                  { id: 'bottom-left', label: 'Bottom Left', icon: AlignLeft },
                  { id: 'bottom-center', label: 'Bottom Center', icon: AlignCenter },
                  { id: 'bottom-right', label: 'Bottom Right', icon: AlignRight },
                ].map((pos) => {
                  const Icon = pos.icon;
                  const isSelected = position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPosition(pos.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-[#2780e3] bg-blue-50/80 text-[#2780e3] font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pos.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numbering Style
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white text-slate-800 focus:outline-hidden focus:border-[#2780e3]"
                >
                  <option value="page-x-of-y">Page X of Y (e.g., Page 1 of 12)</option>
                  <option value="page-x">Page X (e.g., Page 1)</option>
                  <option value="x-of-y">X / Y (e.g., 1 / 12)</option>
                  <option value="x">Simple Number (e.g., 1)</option>
                  <option value="roman">Lowercase Roman (e.g., i, ii, iii)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Font Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex gap-1.5 flex-1">
                    {[
                      { hex: '#1e293b', label: 'Dark' },
                      { hex: '#64748b', label: 'Muted' },
                      { hex: '#2780e3', label: 'Blue' },
                      { hex: '#dc2626', label: 'Red' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`text-[11px] px-2 py-1 rounded border ${
                          color === c.hex
                            ? 'border-slate-800 bg-slate-100 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Prefix / Suffix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. Document"
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:border-[#2780e3]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Suffix (Optional)
                </label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. - Final"
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:border-[#2780e3]"
                />
              </div>
            </div>

            {/* Start Page & Starting Number */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Start on Page
                </label>
                <input
                  type="number"
                  min={1}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Set 2 to skip cover</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  First Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Default: 1</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Font Size ({fontSize}pt)
                </label>
                <input
                  type="range"
                  min={8}
                  max={18}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2780e3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Margin ({margin}pt)
                </label>
                <input
                  type="range"
                  min={12}
                  max={60}
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2780e3]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview & Action */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
              Live Mockup Preview
            </h3>

            {/* Visual sheet representation */}
            <div className="w-full aspect-[1/1.35] bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col justify-between relative shadow-inner">
              {/* Top header bar */}
              <div
                className={`flex text-[11px] font-mono ${
                  position.startsWith('top') ? 'opacity-100' : 'opacity-20'
                }`}
                style={{
                  justifyContent: position.includes('left')
                    ? 'flex-start'
                    : position.includes('right')
                    ? 'flex-end'
                    : 'center',
                  color: color,
                }}
              >
                {position.startsWith('top') ? getPreviewText() : 'Header placeholder'}
              </div>

              {/* Sample Page Content Lines */}
              <div className="space-y-2 opacity-25 px-2">
                <div className="h-3 bg-slate-400 rounded w-3/4"></div>
                <div className="h-2 bg-slate-300 rounded w-full"></div>
                <div className="h-2 bg-slate-300 rounded w-5/6"></div>
                <div className="h-2 bg-slate-300 rounded w-4/6"></div>
                <div className="h-2 bg-slate-300 rounded w-full"></div>
              </div>

              {/* Bottom footer bar */}
              <div
                className={`flex text-[11px] font-mono ${
                  position.startsWith('bottom') ? 'opacity-100' : 'opacity-20'
                }`}
                style={{
                  justifyContent: position.includes('left')
                    ? 'flex-start'
                    : position.includes('right')
                    ? 'flex-end'
                    : 'center',
                  color: color,
                }}
              >
                {position.startsWith('bottom') ? getPreviewText() : 'Footer placeholder'}
              </div>
            </div>

            <div className="mt-4 p-2.5 bg-blue-50/60 rounded text-[11px] text-slate-600 border border-blue-100">
              <span className="font-semibold text-blue-700">Preview text: </span>
              <span className="font-mono">{getPreviewText()}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleApply}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Numbering PDF...' : 'Apply Numbers & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
