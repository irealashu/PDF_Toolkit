import React, { useState, useRef } from 'react';
import {
  FileCode,
  FolderOpen,
  Copy,
  Download,
  Check,
  Search,
  FileText,
} from 'lucide-react';
import { extractPdfText, downloadFile } from '../../utils/pdfHelpers';

interface TextExtractPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const TextExtractPage: React.FC<TextExtractPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      setIsProcessing(true);
      setFile(selected);
      onSetStatus(`Extracting text from ${selected.name}...`, 20);

      const result = await extractPdfText(selected, (pct) => {
        onSetStatus(`Extracting text (${pct}%)...`, pct);
      });

      setExtractedText(result.text);
      onSetStatus('Ready', 100);
      onNotify('Text Extracted', `Successfully extracted text from ${selected.name}`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Text extraction failed: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    onNotify('Copied', 'Extracted text copied to clipboard');
  };

  const handleDownloadTxt = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${file.name.replace(/\.pdf$/i, '')}_extracted.txt`, 'text/plain');
    onNotify('Downloaded', 'Text file exported successfully');
  };

  const filteredText = searchQuery.trim()
    ? extractedText
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
        .join('\n')
    : extractedText;

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleSelectFile}
      />

      <div className="pb-4 border-b border-slate-200 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCode className="w-6 h-6 text-[#2780e3]" />
            Text Extraction
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Extract plain text from all pages of your PDF document for search, copy, or export.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-[#2780e3] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select PDF</span>
          </button>
          {file && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{file.name}</span>
            </div>
          )}
        </div>

        {extractedText && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              {hasCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopied ? 'Copied' : 'Copy All'}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 bg-[#28a745] hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>
          </div>
        )}
      </div>

      {extractedText && (
        <div className="mb-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search within extracted text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2780e3]"
          />
        </div>
      )}

      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto font-mono text-xs text-slate-800 shadow-inner leading-relaxed whitespace-pre-wrap">
        {filteredText || (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <FileCode className="w-10 h-10 mb-2 opacity-50 stroke-1" />
            <p className="text-sm font-sans font-medium text-slate-600">No Text Extracted</p>
            <p className="text-xs font-sans text-slate-400 mt-1">
              Select a PDF file to extract readable text content
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
