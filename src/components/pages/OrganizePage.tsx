import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  Save,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  ArrowRight,
  FilePlus2,
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import { PageItem } from '../../types';
import {
  fileToUint8Array,
  renderPdfThumbnail,
  fileToDataUrl,
  downloadFile,
} from '../../utils/pdfHelpers';

interface OrganizePageProps {
  onNotify: (title: string, message: string, type?: 'success' | 'danger') => void;
  onSetStatus: (status: string, progress?: number) => void;
}

const ITEMS_PER_PAGE = 12;

export const OrganizePage: React.FC<OrganizePageProps> = ({ onNotify, onSetStatus }) => {
  const [items, setItems] = useState<PageItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | null>(null);

  const openPdfInputRef = useRef<HTMLInputElement>(null);
  const addImagesInputRef = useRef<HTMLInputElement>(null);
  const insertPdfInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const displayedItems = items.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleOpenPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      onSetStatus(`Loading ${file.name}...`, 20);

      const bytes = await fileToUint8Array(file);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      onSetStatus(`Rendering thumbnails (0/${pageCount})...`, 40);

      const newItems: PageItem[] = [];
      for (let i = 0; i < pageCount; i++) {
        const thumb = await renderPdfThumbnail(bytes, i);
        newItems.push({
          id: `pdf-${Date.now()}-${i}-${Math.random()}`,
          type: 'pdf',
          sourceFile: file,
          sourceDocBytes: bytes,
          pageIndex: i,
          totalPagesInDoc: pageCount,
          rotation: 0,
          thumbnailUrl: thumb,
          name: file.name,
        });
        onSetStatus(`Rendering thumbnails (${i + 1}/${pageCount})...`, 40 + Math.round(((i + 1) / pageCount) * 50));
      }

      setItems(newItems);
      setCurrentPage(0);
      onSetStatus('Ready', 100);
      onNotify('Success', `Loaded ${pageCount} pages from ${file.name}`);
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Failed to open PDF: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
      if (openPdfInputRef.current) openPdfInputRef.current.value = '';
    }
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsProcessing(true);
      onSetStatus('Adding images...', 30);

      const newImgItems: PageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await fileToDataUrl(file);
        newImgItems.push({
          id: `img-${Date.now()}-${i}-${Math.random()}`,
          type: 'img',
          sourceFile: file,
          pageIndex: 0,
          rotation: 0,
          thumbnailUrl: dataUrl,
          name: file.name,
        });
      }

      setItems((prev) => [...prev, ...newImgItems]);
      onSetStatus('Ready', 100);
      onNotify('Success', `Added ${newImgItems.length} image(s)`);
    } catch (err: any) {
      console.error(err);
      onNotify('Error', `Failed to add images: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
      if (addImagesInputRef.current) addImagesInputRef.current.value = '';
    }
  };

  const handleInsertPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || insertTargetIndex === null) return;

    try {
      setIsProcessing(true);
      onSetStatus(`Inserting ${file.name}...`, 30);

      const bytes = await fileToUint8Array(file);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      const newItems: PageItem[] = [];
      for (let i = 0; i < pageCount; i++) {
        const thumb = await renderPdfThumbnail(bytes, i);
        newItems.push({
          id: `pdf-insert-${Date.now()}-${i}`,
          type: 'pdf',
          sourceFile: file,
          sourceDocBytes: bytes,
          pageIndex: i,
          totalPagesInDoc: pageCount,
          rotation: 0,
          thumbnailUrl: thumb,
          name: file.name,
        });
      }

      setItems((prev) => {
        const copy = [...prev];
        copy.splice(insertTargetIndex + 1, 0, ...newItems);
        return copy;
      });

      onSetStatus('Ready', 100);
      onNotify('Success', `Inserted ${pageCount} pages after page ${insertTargetIndex + 1}`);
    } catch (err: any) {
      console.error(err);
      onNotify('Error', `Failed to insert PDF: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
      setInsertTargetIndex(null);
      if (insertPdfInputRef.current) insertPdfInputRef.current.value = '';
    }
  };

  const rotatePage = (indexInAll: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[indexInAll] = {
        ...copy[indexInAll],
        rotation: (copy[indexInAll].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const deletePage = (indexInAll: number) => {
    setItems((prev) => {
      const copy = prev.filter((_, idx) => idx !== indexInAll);
      return copy;
    });
  };

  const movePage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;

    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[fromIndex];
      copy[fromIndex] = copy[toIndex];
      copy[toIndex] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    if (items.length === 0) return;

    try {
      setIsProcessing(true);
      onSetStatus('Preparing organized document...', 10);

      const outDoc = await PDFDocument.create();
      const pdfMap = new Map<string, PDFDocument>();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onSetStatus(`Writing page ${i + 1}/${items.length}...`, Math.round(((i + 1) / items.length) * 80));

        if (item.type === 'pdf' && item.sourceDocBytes) {
          const key = item.sourceFile.name + item.sourceFile.size;
          let donor = pdfMap.get(key);
          if (!donor) {
            donor = await PDFDocument.load(item.sourceDocBytes);
            pdfMap.set(key, donor);
          }

          const [copiedPage] = await outDoc.copyPages(donor, [item.pageIndex]);
          if (item.rotation) {
            const currentRot = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
          }
          outDoc.addPage(copiedPage);
        } else if (item.type === 'img') {
          const buffer = await item.sourceFile.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let embeddedImage;
          if (item.sourceFile.type === 'image/png' || item.sourceFile.name.toLowerCase().endsWith('.png')) {
            embeddedImage = await outDoc.embedPng(bytes);
          } else {
            embeddedImage = await outDoc.embedJpg(bytes);
          }
          const { width, height } = embeddedImage;
          const page = outDoc.addPage([width, height]);
          if (item.rotation) {
            page.setRotation(degrees(item.rotation));
          }
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
      }

      onSetStatus('Finalizing PDF...', 90);
      const savedBytes = await outDoc.save();
      downloadFile(savedBytes, 'organized_document.pdf');

      onSetStatus('Ready', 100);
      onNotify('Success', 'Organized PDF saved and downloaded successfully');
    } catch (err: any) {
      console.error(err);
      onSetStatus('Error', 0);
      onNotify('Error', `Failed to save PDF: ${err.message || err}`, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={openPdfInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleOpenPdf}
      />
      <input
        type="file"
        ref={addImagesInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddImages}
      />
      <input
        type="file"
        ref={insertPdfInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleInsertPdf}
      />

      {/* Top action toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPdfInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-[#2780e3] hover:bg-blue-600 text-white px-3.5 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open PDF</span>
          </button>

          <button
            onClick={() => addImagesInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Add Images</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {items.length} total pages
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={items.length === 0 || isProcessing}
            className="flex items-center gap-2 bg-[#28a745] hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Result</span>
          </button>
        </div>
      </div>

      {/* Pagination controls */}
      {items.length > 0 && (
        <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2 rounded-lg border border-slate-200/80 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0 || isProcessing}
              className="flex items-center gap-1 text-xs font-semibold text-[#2780e3] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <span className="text-xs font-bold text-slate-700 px-3">
              Page {currentPage + 1} / {totalPages || 1} (Total: {items.length})
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1 || isProcessing}
              className="flex items-center gap-1 text-xs font-semibold text-[#2780e3] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-slate-500">12 thumbnails per view</span>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 bg-white p-5 rounded-lg border border-slate-200 overflow-y-auto min-h-[380px]">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-300 rounded-lg">
            <FilePlus2 className="w-12 h-12 text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Document Opened</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Click &quot;Open PDF&quot; to inspect, reorder, rotate, delete pages, or insert images into your document.
            </p>
            <button
              onClick={() => openPdfInputRef.current?.click()}
              className="bg-[#2780e3] hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm transition-colors"
            >
              Select PDF File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedItems.map((item, localIdx) => {
              const globalIndex = currentPage * ITEMS_PER_PAGE + localIdx;
              return (
                <div
                  key={item.id}
                  className="group bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center shadow-xs hover:shadow-md transition-shadow relative"
                >
                  {/* Thumbnail display */}
                  <div className="w-full h-36 bg-white border border-slate-200 rounded flex items-center justify-center overflow-hidden mb-2 relative">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={`Page ${globalIndex + 1}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-200"
                        style={{ transform: `rotate(${item.rotation}deg)` }}
                      />
                    ) : (
                      <div className="text-xs text-slate-400">Loading...</div>
                    )}
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded font-mono">
                      {item.type.toUpperCase()}
                    </span>
                  </div>

                  {/* Page number */}
                  <span className="text-xs font-medium text-slate-700 mb-2">
                    Page {globalIndex + 1}
                  </span>

                  {/* Actions toolbar */}
                  <div className="w-full flex items-center justify-center gap-1 border-t border-slate-200/80 pt-2">
                    <button
                      title="Rotate 90° Clockwise"
                      onClick={() => rotatePage(globalIndex)}
                      className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Insert PDF after this page"
                      onClick={() => {
                        setInsertTargetIndex(globalIndex);
                        insertPdfInputRef.current?.click();
                      }}
                      className="p-1 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Move Left"
                      disabled={globalIndex === 0}
                      onClick={() => movePage(globalIndex, 'left')}
                      className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Move Right"
                      disabled={globalIndex === items.length - 1}
                      onClick={() => movePage(globalIndex, 'right')}
                      className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      title="Delete Page"
                      onClick={() => deletePage(globalIndex)}
                      className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
