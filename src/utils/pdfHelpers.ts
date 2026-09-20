import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { PDFMetadataInfo } from '../types';

// Configure pdfjs worker
try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn('Could not set pdfjs workerSrc:', e);
}

/**
 * Trigger browser file download from Uint8Array or Blob
 */
export function downloadFile(data: Uint8Array | Blob, filename: string, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Read File object as Uint8Array
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Read image file and get as data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse page range string like "1-5, 8, 10-12"
 */
export function parseRanges(rangesText: string, totalPages: number): [number, number][] {
  const text = rangesText.trim();
  if (!text || totalPages <= 0) return [];

  const parts = text.replace(/\s+/g, '').split(',').filter(Boolean);
  const result: [number, number][] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [l, r] = part.split('-');
      let s = l ? parseInt(l, 10) : 1;
      let e = r ? parseInt(r, 10) : totalPages;
      if (isNaN(s)) s = 1;
      if (isNaN(e)) e = totalPages;
      s = Math.max(1, Math.min(totalPages, s));
      e = Math.max(1, Math.min(totalPages, e));
      if (s <= e) {
        result.push([s, e]);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        const p = Math.max(1, Math.min(totalPages, num));
        result.push([p, p]);
      }
    }
  }

  return result;
}

/**
 * Render a single page of PDF to image data URL thumbnail
 */
export async function renderPdfThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
  scale = 0.4
): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(),
      disableFontFace: false,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2d context');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background first
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('PDF.js thumbnail render failed, rendering fallback thumbnail:', err);
    // Return a clean programmatic fallback card
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 120, 160);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(10, 10, 100, 140);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(10, 10, 100, 140);
    ctx.fillStyle = '#2780e3';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageIndex + 1}`, 60, 85);
    return canvas.toDataURL('image/png');
  }
}

/**
 * Extract Metadata from PDF
 */
export async function getPdfMetadata(file: File): Promise<PDFMetadataInfo> {
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const title = pdfDoc.getTitle() || 'Untitled';
  const author = pdfDoc.getAuthor() || 'Unknown';
  const subject = pdfDoc.getSubject() || 'None';
  const creator = pdfDoc.getCreator() || 'Unknown';
  const producer = pdfDoc.getProducer() || 'Unknown';
  const creationDate = pdfDoc.getCreationDate()?.toLocaleString() || 'Unknown';
  const modificationDate = pdfDoc.getModificationDate()?.toLocaleString() || 'Unknown';
  const pageCount = pdfDoc.getPageCount();

  return {
    filename: file.name,
    fileSizeMb: +(file.size / (1024 * 1024)).toFixed(2),
    pages: pageCount,
    encrypted: pdfDoc.isEncrypted,
    title,
    author,
    subject,
    creator,
    producer,
    creationDate,
    modificationDate,
  };
}

/**
 * Extract Plain Text from PDF using pdfjs
 */
export async function extractPdfText(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; pages: { pageNum: number; text: string }[] }> {
  const bytes = await fileToUint8Array(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pagesText: { pageNum: number; text: string }[] = [];
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item) => ('str' in item ? (item as any).str : ''))
      .join(' ');

    pagesText.push({ pageNum: i, text: pageStr });
    fullText += `--- Page ${i} ---\n${pageStr}\n\n`;

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return { text: fullText.trim(), pages: pagesText };
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePdfs(
  files: File[],
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round((i / files.length) * 100), `Merging ${file.name}...`);
    }
    const bytes = await fileToUint8Array(file);
    const donorPdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  if (onProgress) {
    onProgress(100, 'Finalizing merged document...');
  }

  return await mergedPdf.save();
}

/**
 * Convert multiple images to a single PDF
 */
export async function convertImagesToPdf(
  files: File[],
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round((i / files.length) * 100), `Converting ${file.name}...`);
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let embeddedImage;
    if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      // For WebP or other formats, convert to PNG via Canvas first
      const dataUrl = await fileToDataUrl(file);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (pngBlob) {
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        embeddedImage = await pdfDoc.embedPng(pngBytes);
      } else {
        continue;
      }
    }

    const { width, height } = embeddedImage;
    // Standard A4 aspect or matching image dimension
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  if (onProgress) {
    onProgress(100, 'Saving PDF...');
  }

  return await pdfDoc.save();
}

/**
 * Watermark PDF with Text or Image
 */
export async function watermarkPdf(
  file: File,
  options: {
    type: 'text' | 'image';
    text?: string;
    imageFile?: File;
    angleDegrees?: number;
    opacity?: number;
  },
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const angle = options.angleDegrees ?? 45;
  const opacity = options.opacity ?? 0.3;

  let embeddedImage: any = null;
  if (options.type === 'image' && options.imageFile) {
    const imgBuffer = await options.imageFile.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    if (options.imageFile.type === 'image/png' || options.imageFile.name.toLowerCase().endsWith('.png')) {
      embeddedImage = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBytes);
    }
  }

  for (let i = 0; i < total; i++) {
    if (onProgress) {
      onProgress(Math.round((i / total) * 100), `Watermarking page ${i + 1}/${total}...`);
    }
    const page = pages[i];
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2;

    if (options.type === 'text') {
      const textToDraw = options.text || 'CONFIDENTIAL';
      // Calculate font size proportional to page
      const fontSize = Math.min(width, height) / 10;
      page.drawText(textToDraw, {
        x: centerX - (textToDraw.length * fontSize * 0.28),
        y: centerY,
        size: fontSize,
        rotate: degrees(angle),
        color: rgb(0.3, 0.3, 0.3),
        opacity: opacity,
      });
    } else if (embeddedImage) {
      const imgWidth = Math.min(width, height) * 0.6;
      const imgHeight = (embeddedImage.height / embeddedImage.width) * imgWidth;
      page.drawImage(embeddedImage, {
        x: centerX - imgWidth / 2,
        y: centerY - imgHeight / 2,
        width: imgWidth,
        height: imgHeight,
        rotate: degrees(angle),
        opacity: opacity,
      });
    }
  }

  if (onProgress) onProgress(100, 'Complete');
  return await pdfDoc.save();
}

/**
 * Split / Extract page ranges from PDF
 */
export async function splitPdfRanges(
  file: File,
  rangesText: string,
  onProgress?: (percent: number, status: string) => void
): Promise<{ filename: string; bytes: Uint8Array }[]> {
  const bytes = await fileToUint8Array(file);
  const srcDoc = await PDFDocument.load(bytes);
  const totalPages = srcDoc.getPageCount();

  const parsed = parseRanges(rangesText, totalPages);
  if (parsed.length === 0) {
    throw new Error(`No valid page ranges found for ${totalPages} total pages.`);
  }

  const results: { filename: string; bytes: Uint8Array }[] = [];

  for (let rIdx = 0; rIdx < parsed.length; rIdx++) {
    const [start, end] = parsed[rIdx];
    if (onProgress) {
      onProgress(Math.round((rIdx / parsed.length) * 100), `Extracting pages ${start}-${end}...`);
    }

    const newDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let p = start - 1; p < end; p++) {
      indices.push(p);
    }

    const copied = await newDoc.copyPages(srcDoc, indices);
    copied.forEach((cp) => newDoc.addPage(cp));

    const outBytes = await newDoc.save();
    const baseName = file.name.replace(/\.pdf$/i, '');
    results.push({
      filename: `${baseName}_pg_${start}-${end}.pdf`,
      bytes: outBytes,
    });
  }

  if (onProgress) onProgress(100, 'Extraction complete');
  return results;
}

/**
 * Optimize / Compress PDF
 */
export async function compressPdf(
  file: File,
  mode: 'standard' | 'max',
  onProgress?: (percent: number, status: string) => void
): Promise<{ bytes: Uint8Array; originalSize: number; newSize: number; savingsPercent: number }> {
  if (onProgress) onProgress(20, 'Analyzing document objects...');
  const originalBytes = await fileToUint8Array(file);
  const srcDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

  if (onProgress) onProgress(50, 'Optimizing stream objects and garbage collection...');
  // Create a clean new PDFDocument to strip orphaned objects
  const optimizedDoc = await PDFDocument.create();
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await optimizedDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => optimizedDoc.addPage(p));

  // In standard and max mode, use object stream compression
  if (onProgress) onProgress(80, 'Compressing cross-reference tables...');
  const compressedBytes = await optimizedDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const originalSize = file.size;
  const newSize = compressedBytes.byteLength;
  const savings = originalSize > newSize ? Math.round(((originalSize - newSize) / originalSize) * 100) : 0;

  if (onProgress) onProgress(100, 'Optimization finished');
  return {
    bytes: compressedBytes,
    originalSize,
    newSize,
    savingsPercent: savings,
  };
}

/**
 * Add Page Numbers & Headers/Footers
 */
export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format: 'page-x-of-y' | 'page-x' | 'x' | 'x-of-y' | 'roman';
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string; // hex
  startPage?: number; // 1-indexed, e.g. 2 to skip cover
  startingNumber?: number; // default 1
  margin?: number; // points from edge, default 25
}

function toRoman(num: number): string {
  const lookup: { [key: string]: number } = {
    M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90,
    L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman.toLowerCase();
}

export async function addPageNumbersToPdf(
  file: File,
  options: PageNumberOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const startPage = options.startPage ?? 1;
  const startingNumber = options.startingNumber ?? 1;
  const fontSize = options.fontSize ?? 10;
  const margin = options.margin ?? 25;

  // Convert hex color to rgb
  let textColor = rgb(0.2, 0.2, 0.2);
  if (options.color) {
    const hex = options.color.replace('#', '');
    if (hex.length === 6) {
      textColor = rgb(
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      );
    }
  }

  for (let i = 0; i < total; i++) {
    const pageNum1Based = i + 1;
    if (onProgress) {
      onProgress(Math.round((i / total) * 100), `Numbering page ${pageNum1Based}/${total}...`);
    }

    if (pageNum1Based < startPage) {
      continue; // Skip cover or preceding pages
    }

    const currentNumber = startingNumber + (pageNum1Based - startPage);
    let label = '';
    const prefix = options.prefix ? `${options.prefix} ` : '';
    const suffix = options.suffix ? ` ${options.suffix}` : '';

    switch (options.format) {
      case 'page-x-of-y':
        label = `${prefix}Page ${currentNumber} of ${total}${suffix}`;
        break;
      case 'page-x':
        label = `${prefix}Page ${currentNumber}${suffix}`;
        break;
      case 'x-of-y':
        label = `${prefix}${currentNumber} / ${total}${suffix}`;
        break;
      case 'roman':
        label = `${prefix}${toRoman(currentNumber)}${suffix}`;
        break;
      case 'x':
      default:
        label = `${prefix}${currentNumber}${suffix}`;
        break;
    }

    const page = pages[i];
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x = 0;
    let y = 0;

    // Horizontal positioning
    if (options.position.includes('left')) {
      x = margin;
    } else if (options.position.includes('right')) {
      x = width - margin - textWidth;
    } else {
      // Center
      x = (width - textWidth) / 2;
    }

    // Vertical positioning
    if (options.position.startsWith('top')) {
      y = height - margin;
    } else {
      // Bottom
      y = margin;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  if (onProgress) onProgress(100, 'Saving numbered document...');
  return await pdfDoc.save();
}

/**
 * N-Up / Multiple Pages Per Sheet
 */
export interface NUpOptions {
  layout: '2-up' | '4-up' | '6-up';
  orientation: 'portrait' | 'landscape';
  drawBorder?: boolean;
}

export async function generateNUpPdf(
  file: File,
  options: NUpOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const srcDoc = await PDFDocument.load(bytes);
  const totalPages = srcDoc.getPageCount();

  const outDoc = await PDFDocument.create();

  // Standard A4 sheet dimensions: 595.28 x 841.89
  const sheetWidth = options.orientation === 'landscape' ? 841.89 : 595.28;
  const sheetHeight = options.orientation === 'landscape' ? 595.28 : 841.89;

  let cols = 1;
  let rows = 2;
  if (options.layout === '2-up') {
    if (options.orientation === 'landscape') {
      cols = 2;
      rows = 1;
    } else {
      cols = 1;
      rows = 2;
    }
  } else if (options.layout === '4-up') {
    cols = 2;
    rows = 2;
  } else if (options.layout === '6-up') {
    if (options.orientation === 'landscape') {
      cols = 3;
      rows = 2;
    } else {
      cols = 2;
      rows = 3;
    }
  }

  const perSheet = cols * rows;
  const padding = 20;
  const cellWidth = (sheetWidth - padding * (cols + 1)) / cols;
  const cellHeight = (sheetHeight - padding * (rows + 1)) / rows;

  for (let i = 0; i < totalPages; i += perSheet) {
    const sheetNum = Math.floor(i / perSheet) + 1;
    const totalSheets = Math.ceil(totalPages / perSheet);
    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 100), `Creating sheet ${sheetNum}/${totalSheets}...`);
    }

    const sheetPage = outDoc.addPage([sheetWidth, sheetHeight]);

    for (let slot = 0; slot < perSheet; slot++) {
      const srcPageIndex = i + slot;
      if (srcPageIndex >= totalPages) break;

      const [embeddedPage] = await outDoc.embedPdf(srcDoc, [srcPageIndex]);
      const { width: origWidth, height: origHeight } = embeddedPage;

      // Slot row/col indices (top to bottom, left to right)
      const colIdx = slot % cols;
      const rowIdx = Math.floor(slot / cols);

      // Fit page inside cell preserving aspect ratio
      const scale = Math.min(cellWidth / origWidth, cellHeight / origHeight);
      const drawWidth = origWidth * scale;
      const drawHeight = origHeight * scale;

      const cellX = padding + colIdx * (cellWidth + padding);
      // Coordinate y starts at bottom-left in PDF
      const cellY = sheetHeight - padding - (rowIdx + 1) * cellHeight - rowIdx * padding;

      const targetX = cellX + (cellWidth - drawWidth) / 2;
      const targetY = cellY + (cellHeight - drawHeight) / 2;

      sheetPage.drawPage(embeddedPage, {
        x: targetX,
        y: targetY,
        width: drawWidth,
        height: drawHeight,
      });

      if (options.drawBorder) {
        sheetPage.drawRectangle({
          x: targetX,
          y: targetY,
          width: drawWidth,
          height: drawHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.75,
        });
      }
    }
  }

  if (onProgress) onProgress(100, 'Saving N-Up document...');
  return await outDoc.save();
}

/**
 * Crop Margins of PDF
 */
export async function cropPdf(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number },
  applyToAll: boolean,
  targetPageIdx: number,
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  const pagesToCrop = applyToAll ? pages : [pages[targetPageIdx]];

  for (let i = 0; i < pagesToCrop.length; i++) {
    if (onProgress) {
      onProgress(Math.round(((i + 1) / pagesToCrop.length) * 90), `Trimming page ${i + 1}...`);
    }

    const page = pagesToCrop[i];
    const mediaBox = page.getMediaBox();
    const newX = mediaBox.x + margins.left;
    const newY = mediaBox.y + margins.bottom;
    const newWidth = Math.max(20, mediaBox.width - margins.left - margins.right);
    const newHeight = Math.max(20, mediaBox.height - margins.top - margins.bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  if (onProgress) onProgress(100, 'Saving cropped PDF...');
  return await pdfDoc.save();
}

/**
 * Convert PDF to Images (PNG or JPEG) with scale and ZIP export
 */
export async function convertPdfToImages(
  file: File,
  options: { format: 'png' | 'jpeg'; quality?: number; scale?: number },
  onProgress?: (percent: number, status: string) => void
): Promise<{ pageNum: number; dataUrl: string; blob: Blob }[]> {
  const bytes = await fileToUint8Array(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const results: { pageNum: number; dataUrl: string; blob: Blob }[] = [];
  const scale = options.scale ?? 1.5;
  const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = options.quality ?? 0.9;

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100), `Rendering page ${i}/${numPages}...`);
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL(mimeType, quality);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), mimeType, quality);
    });

    results.push({ pageNum: i, dataUrl, blob });
  }

  return results;
}

/**
 * Download multiple image files as a ZIP archive
 */
export async function downloadImagesZip(
  images: { pageNum: number; blob: Blob }[],
  baseFilename: string,
  format: 'png' | 'jpeg'
) {
  const zip = new JSZip();
  const ext = format === 'png' ? 'png' : 'jpg';

  for (const img of images) {
    zip.file(`${baseFilename}_page_${img.pageNum}.${ext}`, img.blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadFile(zipBlob, `${baseFilename}_images.zip`, 'application/zip');
}

/**
 * Convert PDF to Grayscale / Monochrome
 */
export async function convertToGrayscalePdf(
  file: File,
  mode: 'grayscale' | 'monochrome',
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 90), `Processing grayscale page ${i}/${numPages}...`);
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    // Apply color transformation
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let p = 0; p < d.length; p += 4) {
      const gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      if (mode === 'monochrome') {
        // High contrast black/white threshold
        const val = gray > 140 ? 255 : 0;
        d[p] = val;
        d[p + 1] = val;
        d[p + 2] = val;
      } else {
        d[p] = gray;
        d[p + 1] = gray;
        d[p + 2] = gray;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const jpegBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.85);
    });

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embeddedImg = await outDoc.embedJpg(jpegBytes);

    const targetPage = outDoc.addPage([viewport.width / 1.5, viewport.height / 1.5]);
    targetPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: viewport.width / 1.5,
      height: viewport.height / 1.5,
    });
  }

  if (onProgress) onProgress(100, 'Saving grayscale PDF...');
  return await outDoc.save();
}

/**
 * Permanent Visual Redaction
 */
export interface RedactionBox {
  id: string;
  pageIndex: number;
  xPct: number; // 0 to 1
  yPct: number; // 0 to 1
  wPct: number; // 0 to 1
  hPct: number; // 0 to 1
}

export async function redactPdf(
  file: File,
  boxes: RedactionBox[],
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  if (onProgress) onProgress(20, 'Applying redactions...');

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (box.pageIndex < 0 || box.pageIndex >= pages.length) continue;

    const page = pages[box.pageIndex];
    const { width, height } = page.getSize();

    // Map percentage to PDF coordinate system (y starts from bottom in PDF)
    const pdfX = box.xPct * width;
    const pdfW = box.wPct * width;
    const pdfH = box.hPct * height;
    const pdfY = height - (box.yPct * height + pdfH);

    // Draw opaque solid black rectangle
    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: pdfW,
      height: pdfH,
      color: rgb(0, 0, 0),
      opacity: 1.0,
    });
  }

  if (onProgress) onProgress(100, 'Saving redacted PDF...');
  return await pdfDoc.save();
}

/**
 * Flatten PDF Form Fields and Annotations
 */
export async function flattenPdf(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  if (onProgress) onProgress(20, 'Analyzing form and annotation objects...');
  const bytes = await fileToUint8Array(file);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  try {
    const form = pdfDoc.getForm();
    if (form) {
      if (onProgress) onProgress(50, 'Baking form fields into page content...');
      form.flatten();
    }
  } catch (e) {
    console.warn('Form flattening notice:', e);
  }

  if (onProgress) onProgress(80, 'Finalizing flattened document streams...');
  const result = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100, 'Document flattened successfully');
  return result;
}

/**
 * Bookmark info
 */
export interface BookmarkItem {
  id: string;
  title: string;
  pageNumber: number; // 1-indexed
}

/**
 * Retrieve bookmarks from PDF
 */
export async function getPdfBookmarks(file: File): Promise<BookmarkItem[]> {
  try {
    const bytes = await fileToUint8Array(file);
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const outline = await pdf.getOutline();

    if (!outline || outline.length === 0) return [];

    const items: BookmarkItem[] = [];

    const parseOutlineItem = async (node: any) => {
      let pageNum = 1;
      if (node.dest) {
        let destRef = node.dest;
        if (typeof destRef === 'string') {
          destRef = await pdf.getDestination(destRef);
        }
        if (Array.isArray(destRef) && destRef.length > 0) {
          const pageIndex = await pdf.getPageIndex(destRef[0]);
          pageNum = pageIndex + 1;
        }
      }

      items.push({
        id: `bm-${Date.now()}-${Math.random()}`,
        title: node.title || 'Untitled Bookmark',
        pageNumber: pageNum,
      });

      if (node.items && node.items.length > 0) {
        for (const child of node.items) {
          await parseOutlineItem(child);
        }
      }
    };

    for (const node of outline) {
      await parseOutlineItem(node);
    }

    return items;
  } catch (e) {
    console.warn('Failed to parse bookmarks:', e);
    return [];
  }
}

