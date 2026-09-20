# PDF Toolkit v1.0 Pro

> A comprehensive, privacy-first client-side web application for organizing, editing, converting, securing, and inspecting PDF documents entirely in your browser. Zero server uploads, zero telemetry.

---

## Overview

**PDF Toolkit v1.0 Pro** is a modern, high-performance web suite built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. It provides an all-in-one suite of 18+ PDF utilities powered by client-side WebAssembly and JavaScript engines (**pdf-lib**, **PDF.js**, and **JSZip**).

All processing occurs entirely inside your web browser. Your private documents, sensitive forms, and confidential files never leave your computer.

---

## Key Features & Toolkit Modules

### 1. Document Pages Management
* **Organize Pages**: Visual thumbnail grid for all PDF pages. Rotate individual or all pages (90° clockwise / counter-clockwise), drag-and-drop or reorder pages, insert external PDF pages or images, delete unwanted pages, and navigate large documents with responsive pagination.
* **Merge PDFs**: Combine multiple PDF files into a single unified document with custom ordering.
* **Split & Extract**: Extract specific page ranges (e.g., `1-5, 8, 10-12` or open-ended ranges like `5-`) and save as a single consolidated PDF or separate individual files.
* **N-Up Handouts**: Condense slides and document pages onto single printed sheets (2-Up, 4-Up 2×2 grid, or 6-Up 2×3 grid) with configurable page orientations (Portrait / Landscape) and optional slide framing borders.
* **Crop Margins**: Interactive visual crop preview with live bounding box. Trim Top, Bottom, Left, and Right margins in points or inches with quick presets (0.5", 1.0", Header/Footer strip), applied document-wide or to target pages.
* **Page Numbers & Headers/Footers**: Stamp customizable pagination across documents. Supports 6-position placement grid (Top/Bottom, Left/Center/Right), dynamic styles (`Page X of Y`, `Page X`, `X / Y`, integers, or Roman numerals `i, ii, iii`), customizable font size, margin offsets, custom prefix/suffix, and cover page skipping.

### 2. Convert & Export
* **Image to PDF**: Convert photos and graphics (JPG, PNG, WebP) into formatted PDF documents with customizable margins and orientation.
* **PDF to Images**: High-fidelity page rasterization to PNG or JPEG at selectable resolutions (1.0x, 1.5x, 2.0x 150 DPI, 3.0x 300 DPI). Preview pages, download individual images, or export all rendered pages into a single **ZIP archive**.
* **Grayscale & Monochrome**: Transform colored PDFs into true 256-shade grayscale or high-contrast 1-bit monochrome black-and-white for laser printing, faxing, and toner saving.
* **Text Extraction**: Fast text content extraction with character/word counters, real-time query search filtering, clipboard copying, and `.txt` file export.

### 3. Edit & Protect
* **Permanent Visual Redaction**: Interactive document canvas with click-and-drag drawing tool to mark blackout redaction rectangles over sensitive text, numbers, or photos. Redactions are physically baked as opaque vector rectangles into the PDF stream so text cannot be highlighted, uncovered, or extracted.
* **Form & Annotation Flattening**: Permanently bake interactive PDF AcroForms, fillable text boxes, radio buttons, and digital annotations into the native page stream. Eliminates unauthorized alteration and guarantees visual fidelity across mobile and desktop readers.
* **Watermark**: Stamp custom text or image watermarks with control over opacity, rotation angle (-180° to 180°), font size, color, and layer depth (foreground or background).
* **Security & Encrypt**: Password protection and metadata security policy enforcement.
* **Compress PDF**: Optimize PDF file size by stripping redundant objects and re-encoding streams with Standard and Maximum compression presets.

### 4. Inspect & Compare
* **PDF Compare / Visual Diff**: Compare two PDF document revisions side-by-side with synchronized zoom and page navigation, or generate a **Difference Map Overlay** that uses composite pixel difference blending to highlight altered, displaced, or added elements.
* **Bookmarks & Table of Contents Editor**: Inspect embedded document outlines, add new bookmark destinations, reorder navigation items, and write updated outlines to the PDF.
* **PDF Info & Metadata**: Inspect document metadata (page count, dimensions, PDF version, title, author, subject, creator, creation/modification dates) and edit document title, author, and subject tags.

### 5. Workspace & Productivity
* **Collapsible Sidebar**: Toggle between a spacious 64-column navigation drawer and an ultra-compact icon-only sidebar (`w-16`) to maximize workspace for page grids, document canvas inspection, and side-by-side comparison.
* **Keyboard Shortcuts**: Press `Ctrl + B` (or `Cmd + B` on macOS) at any time to instantly collapse or expand the navigation menu.
* **Saved Preferences**: Remembers your preferred sidebar state in local browser storage.
* **Status Bar & Notifications**: Real-time progress percentage bar, live operation logs, and auto-dismissing toast notifications.

---

## Technology Stack

* **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **PDF Processing Engine**: [pdf-lib](https://pdf-lib.js.org/)
* **PDF Rendering & Rasterization**: [PDF.js (pdfjs-dist)](https://mozilla.github.io/pdf.js/)
* **Archive Packaging**: [JSZip](https://stuk.github.io/jszip/)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## Privacy & Security

* **100% Client-Side Processing**: No PDF or image data is ever transmitted over the network or stored on any remote server.
* **Offline Compatible**: Once loaded, all PDF transformations, conversions, and rendering operations execute locally via your browser's JavaScript runtime and Web Workers.
* **Zero Telemetry**: No third-party trackers, analytics scripts, or cookies.

---

## Local Development & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* npm, yarn, or bun

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/irealashu/PDF_Toolkit.git
   cd PDF_Toolkit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. Type-check and build for production:
   ```bash
   npm run lint
   npm run build
   ```

5. Preview production build:
   ```bash
   npm run preview
   ```

---

## Deployment (GitHub Actions)

This repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml` and `deploy.yml`) for continuous deployment to **GitHub Pages**:

* Automatically triggers on push to `main` or `master` branch.
* Runs type checking (`npm run lint`), compiles production assets with Vite (`npm run build`), and publishes the `dist/` directory to GitHub Pages.

---

## Author & Project Information

* **Developer**: Ashutosh Singh
* **Email**: [kshatriya205902@gmail.com](mailto:kshatriya205902@gmail.com)
* **Portfolio**: [https://irealashu.in](https://irealashu.in)
* **Version**: v1.0 Pro
* **License**: [Apache License 2.0](LICENSE)
