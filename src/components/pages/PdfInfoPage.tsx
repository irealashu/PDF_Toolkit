import React, { useState, useRef } from 'react';
import {
  Info,
  FolderOpen,
  FileText,
  Calendar,
  User,
  Shield,
  Layers,
  HardDrive,
  Tag,
  BookOpen,
} from 'lucide-react';
import { getPdfMetadata } from '../../utils/pdfHelpers';
import { PDFMetadataInfo } from '../../types';

interface PdfInfoPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const PdfInfoPage: React.FC<PdfInfoPageProps> = ({ onNotify, onSetStatus }) => {
  const [metadata, setMetadata] = useState<PDFMetadataInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      onSetStatus(`Extracting metadata from ${file.name}...`, 40);

      const info = await getPdfMetadata(file);
      setMetadata(info);

      onSetStatus('Ready', 100);
      onNotify('Metadata Loaded', `Loaded information for ${file.name}`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Failed to read metadata: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleSelectFile}
      />

      <div className="pb-4 border-b border-slate-200 mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-6 h-6 text-[#2780e3]" />
          PDF Info & Metadata Viewer
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect document properties, page counts, authorship, dates, and security markers.
        </p>
      </div>

      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs mb-6">
        <label className="block text-xs font-bold text-[#2780e3] uppercase tracking-wider mb-3">
          Select Document
        </label>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-[#2780e3] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Open PDF to Inspect</span>
        </button>
      </div>

      {metadata ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">{metadata.filename}</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
              {metadata.pages} Pages
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Title</span>
                <span className="text-sm font-medium text-slate-800">{metadata.title}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Author</span>
                <span className="text-sm font-medium text-slate-800">{metadata.author}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Subject / Description</span>
                <span className="text-sm font-medium text-slate-800">{metadata.subject}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">File Size</span>
                <span className="text-sm font-medium text-slate-800">{metadata.fileSizeMb} MB</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Producer / Software</span>
                <span className="text-sm font-medium text-slate-800">{metadata.producer}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Encrypted</span>
                <span className="text-sm font-medium text-slate-800">
                  {metadata.encrypted ? 'Yes (Password Protected)' : 'No (Standard Access)'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Creation Date</span>
                <span className="text-sm font-medium text-slate-800">{metadata.creationDate}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Modification Date</span>
                <span className="text-sm font-medium text-slate-800">
                  {metadata.modificationDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center text-slate-400">
          <Info className="w-10 h-10 mx-auto stroke-1 mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-600">No Document Selected</p>
          <p className="text-xs text-slate-400 mt-1">Open a PDF file to see detailed metadata</p>
        </div>
      )}
    </div>
  );
};
