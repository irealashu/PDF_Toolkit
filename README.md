**PDF Toolkit v6.0 Pro**

**Overview**
PDF Toolkit v6.0 Pro is a feature-rich desktop application built with Python that provides a complete suite of PDF manipulation and image conversion tools. It combines a modern, intuitive graphical interface with powerful backend processing capabilities, making complex PDF operations accessible to users of all technical levels.

**Key Features**

**1. Organize & Edit Pages**
Load PDF documents and visually preview all pages in a grid layout
Rotate individual pages (90° increments)
Reorder pages by inserting new PDFs at specific positions
Add images directly to PDF documents alongside existing PDF pages
Delete unwanted pages with one click
Paginated view (12 pages per screen) for manageable navigation of large documents
Support for password-protected PDFs with secure authentication

**2. Merge PDFs (Strict PDF-only)**
Combine multiple PDF files into a single document
Simplified workflow focused exclusively on PDF merging
Real-time progress tracking
Batch processing with minimal user interaction

**3. Image to PDF Conversion**
Dedicated section for converting images to PDF format
Support for multiple image formats: JPG, PNG, JPEG, WebP
Batch convert multiple images into a single combined PDF
Automatic RGB conversion for compatibility
Clean, intuitive UI with list-based file management

**4. Split & Extract Pages**
Extract specific page ranges from any PDF
Flexible range syntax: 1-5, 8, 10-12 (supports open ranges like -5 or 10-)
Export extracted ranges as individual PDF files
Batch processing of multiple ranges in one operation

**5. Watermarking**
Add text or image watermarks to PDFs
Customizable rotation angle (degrees) for watermark placement
Text watermarks with semi-transparent overlay
Image watermarks with automatic scaling
Apply uniform watermarks across all pages

**6. Compression & Optimization**
Two compression levels:
Standard Mode: Balanced compression with reasonable processing time
Maximum Mode: Aggressive compression for smaller file sizes
Deflate compression for reduced file size
Smart garbage collection to remove redundant objects

**7. Security & Encryption**
Encrypt PDFs: Password-protect documents to restrict access
Decrypt PDFs: Remove password protection from encrypted files
Support for encrypted PDF handling during organize operations
User-friendly password prompts for encrypted source files

**UI Framework**
ttkbootstrap: Modern, themed Tkinter implementation
Theme: Cosmo (clean, professional appearance)
Color Palette: Strict Blue (Primary), Green (Success), Red (Danger)
Resolution: 1280×900 windowed interface
Responsive Layout: Sidebar navigation with content area

**Core Libraries**
pypdf: PDF reading, writing, and manipulation
PyMuPDF (fitz): Advanced PDF rendering and page extraction
Pillow (PIL): Image processing and format conversion
ReportLab: Canvas-based watermark generation
Threading: Async operations to prevent UI freezing
Queue System: Inter-thread communication for progress updates

**Key Design Patterns**
Worker Thread Architecture: Long-running operations execute in background threads
Progress Queue System: Real-time status, progress bars, and notifications
Page Caching: Efficient rendering with thumbnail previews
Metadata Management: Internal representation of PDF pages and images
Password Dialog System: Secure handling of encrypted PDFs

**User Experience Highlights**
Navigation
Sidebar Menu: Quick access to 8 distinct functional sections
Status Bar: Real-time operation status and progress indicator
Toast Notifications: Success/error feedback (or fallback message boxes)
Breadcrumb-style UI: Clear visual hierarchy

**Workflow Enhancements**
Drag-and-Drop Alternative: File dialogs for intuitive file selection
Batch Processing: Handle multiple files in single operations
Visual Feedback: Grid previews, pagination controls, progress bars
Error Handling: Graceful degradation with user-friendly error messages
Session Persistence: Current working state maintained during operations

**Performance Optimizations**
Lazy Loading: Pages rendered on-demand during preview
Thumbnails: Lightweight 100×140 pixel previews for quick display
Threaded Operations: Non-blocking UI during processing
Memory Efficient: Stream-based processing for large files

**File Format Support**
Operation	Formats Supported
PDF Input	*.pdf (including encrypted)
Image Input	*.jpg, *.png, *.jpeg, *.webp
Image Source	*.png, *.jpg (for watermarks)
Output	*.pdf (all operations)

**Technical Dependencies**
Python 3.7+
ttkbootstrap (UI framework)
pypdf (PDF manipulation)
pymupdf/fitz (PDF rendering)
pillow (image processing)
reportlab (watermark generation)
tkinter (standard library)

**Development Information**
Developer: Ashutosh Singh
Repository: irealashu/PDF_Toolkit
Language: Python, Batchfile
Version: 6.0 Pro
