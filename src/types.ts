export type NavSection =
  | 'organize'
  | 'merge'
  | 'img2pdf'
  | 'split'
  | 'watermark'
  | 'compress'
  | 'protect'
  | 'info'
  | 'extract'
  | 'pagenumber'
  | 'nup'
  | 'crop'
  | 'pdf2img'
  | 'grayscale'
  | 'redact'
  | 'flatten'
  | 'compare'
  | 'bookmarks'
  | 'about';

export interface PageItem {
  id: string;
  type: 'pdf' | 'img';
  sourceFile: File;
  sourceDocBytes?: Uint8Array;
  pageIndex: number; // 0-indexed page in the original PDF
  totalPagesInDoc?: number;
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  name: string;
}

export interface PDFMetadataInfo {
  filename: string;
  fileSizeMb: number;
  pages: number;
  encrypted: boolean;
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'danger' | 'info' | 'warning';
}
