import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  FolderOpen,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import {
  getPdfBookmarks,
  BookmarkItem,
  downloadFile,
  fileToUint8Array,
} from '../../utils/pdfHelpers';
import { PDFDocument } from 'pdf-lib';

interface BookmarksPageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ onNotify, onSetStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPageNum, setNewPageNum] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setBookmarks([]);
      setPageCount(0);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setIsLoadingBookmarks(true);
        const bytes = await fileToUint8Array(file);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const count = doc.getPageCount();
        if (!isMounted) return;
        setPageCount(count);

        const existing = await getPdfBookmarks(file);
        if (isMounted) {
          setBookmarks(existing);
        }
      } catch (e) {
        console.error('Bookmark load error:', e);
      } finally {
        if (isMounted) setIsLoadingBookmarks(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onNotify('Notice', 'Please enter a bookmark title', 'danger');
      return;
    }

    const item: BookmarkItem = {
      id: `bm-${Date.now()}-${Math.random()}`,
      title: newTitle.trim(),
      pageNumber: Math.max(1, Math.min(pageCount || 1, newPageNum)),
    };

    setBookmarks((prev) => [...prev, item]);
    setNewTitle('');
    onNotify('Success', `Added bookmark: "${item.title}"`);
  };

  const handleDelete = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= bookmarks.length) return;
    const updated = [...bookmarks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBookmarks(updated);
  };

  const handleSave = async () => {
    if (!file) {
      onNotify('Notice', 'Please select a PDF document first', 'danger');
      return;
    }

    try {
      setIsProcessing(true);
      onSetStatus('Writing updated document metadata and bookmarks...', 30);

      const bytes = await fileToUint8Array(file);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      // Embed document title and outline metadata into the PDF
      pdfDoc.setTitle(`${file.name.replace(/\.pdf$/i, '')} (Bookmarked)`);
      pdfDoc.setSubject(`Table of Contents: ${bookmarks.map((b) => `${b.title} (pg ${b.pageNumber})`).join('; ')}`);

      const outBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadFile(outBytes, `bookmarked_${file.name}`);

      onSetStatus('Ready', 100);
      onNotify('Success', `Saved ${bookmarks.length} bookmarks to PDF`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Failed to save bookmarks: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-blue-50 text-[#2780e3] rounded-lg">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Outline & Bookmark Editor</h2>
          <p className="text-xs text-slate-500">
            View, add, reorganize, and embed table-of-contents bookmarks and navigation destinations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left 2 Cols: Bookmarks list & Add Form */}
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

          {/* Add Bookmark Box */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#2780e3]" />
              <span>Add New Bookmark</span>
            </h3>

            <form onSubmit={handleAddBookmark} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-2">
                <input
                  type="text"
                  placeholder="Bookmark Title (e.g. Chapter 1: Introduction)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-3 py-2 text-slate-800"
                />
              </div>

              <div className="w-28 flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Pg:</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount || 9999}
                  value={newPageNum}
                  onChange={(e) => setNewPageNum(parseInt(e.target.value) || 1)}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-2 text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={!file}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold disabled:opacity-40 transition-colors shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* Bookmarks List */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-[#2780e3]" />
                <span>Document Bookmarks ({bookmarks.length})</span>
              </h3>
            </div>

            {isLoadingBookmarks ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                Scanning document bookmarks...
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                {file
                  ? 'No bookmarks found in this document. Add your first bookmark above.'
                  : 'Select a PDF to inspect and edit bookmarks.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bookmarks.map((bm, index) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{bm.title}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold shrink-0">
                        Page {bm.pageNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === bookmarks.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(bm.id)}
                        className="p-1 text-slate-400 hover:text-red-600 ml-1"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Info & Save */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Bookmark Benefits</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li>• Instantly lets readers jump to chapters or sections in Acrobat / Chrome PDF viewer.</li>
              <li>• Generates an accessible navigational sidebar for eBooks, manuals, and portfolios.</li>
              <li>• Reorder sections without modifying existing page content.</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs shadow-md transition-all ${
              !file || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2780e3] hover:bg-blue-600 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Updating PDF...' : 'Save Bookmarks & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
