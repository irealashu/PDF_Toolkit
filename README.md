# PDF Toolkit v7.0 Pro

## Overview
PDF Toolkit v7.0 Pro is a feature-rich desktop application built with Python that provides a complete suite of PDF manipulation and image conversion tools. It combines a modern, intuitive graphical interface with powerful backend processing capabilities, designed for both casual users and professionals who work with PDF documents and images.

## Key Features

### 1. Organize & Edit Pages
- Load PDF documents and visually preview all pages in a grid layout
- Rotate individual pages (90° increments)
- Reorder pages by inserting new PDFs at specific positions
- Add images directly to PDF documents alongside existing PDF pages
- Delete unwanted pages with one click
- Paginated view (12 pages per screen) for manageable navigation of large documents
- Support for password-protected PDFs with secure authentication
- Multi-threaded thumbnail rendering for responsive UI

### 2. Merge PDFs (Strict PDF-only)
- Combine multiple PDF files into a single document
- Simplified workflow focused exclusively on PDF merging
- Real-time progress tracking
- Batch processing with minimal user interaction

### 3. Image to PDF Conversion
- Dedicated section for converting images to PDF format
- Support for multiple image formats: JPG, PNG, JPEG, WebP
- Batch convert multiple images into a single combined PDF
- Automatic RGB conversion for compatibility
- Clean, intuitive UI with list-based file management

### 4. Split & Extract Pages
- Extract specific page ranges from any PDF
- Flexible range syntax: 1-5, 8, 10-12 (supports open ranges like -5 or 10-)
- Export extracted ranges as individual PDF files
- Batch processing of multiple ranges in one operation

### 5. Watermarking
- Add text or image watermarks to PDFs
- Customizable rotation angle (degrees) for watermark placement
- Text watermarks with semi-transparent overlay
- Image watermarks with automatic scaling
- Apply uniform watermarks across all pages

### 6. Compression & Optimization
- Two compression levels:
  - **Standard Mode**: Balanced compression with reasonable processing time
  - **Maximum Mode**: Aggressive compression for smaller file sizes
- Deflate compression for reduced file size
- Smart garbage collection to remove redundant objects
- Real-time progress feedback during optimization

### 7. Security & Encryption
- Encrypt PDFs: Password-protect documents to restrict access
- Decrypt PDFs: Remove password protection from encrypted files
- Support for encrypted PDF handling during organize operations
- User-friendly password prompts for encrypted source files

## UI Framework
- **ttkbootstrap**: Modern, themed Tkinter implementation
- **Theme**: Cosmo (clean, professional appearance)
- **Color Palette**: Strict Blue (Primary), Green (Success), Red (Danger)
- **Resolution**: 1280×900 windowed interface
- **Responsive Layout**: Sidebar navigation with content area

## Core Libraries
- **pypdf**: PDF reading, writing, and manipulation
- **PyMuPDF (fitz)**: Advanced PDF rendering and page extraction
- **Pillow (PIL)**: Image processing and format conversion
- **ReportLab**: Canvas-based watermark generation
- **cryptography**: Secure password handling
- **Threading**: Async operations to prevent UI freezing
- **Queue System**: Inter-thread communication for progress updates

## Key Design Patterns & Improvements (v7.0)
- **Comprehensive Error Handling**: Try-catch blocks throughout with detailed logging
- **Worker Thread Architecture**: Long-running operations execute in background threads
- **Memory Management**: Proper resource cleanup and file closing
- **Thread-Safe Operations**: Lock-based synchronization for shared data structures
- **Input Validation**: File existence and size checks before processing
- **Configuration Management**: Centralized constants for easy customization
- **Logging System**: Full operation audit trail to `pdf_toolkit.log`
- **Progress Queue System**: Real-time status, progress bars, and notifications
- **Page Caching**: Efficient rendering with thumbnail previews
- **Metadata Management**: Internal representation of PDF pages and images
- **Password Dialog System**: Secure handling of encrypted PDFs

## User Experience Highlights

### Navigation
- Sidebar Menu: Quick access to 8 distinct functional sections
- Status Bar: Real-time operation status and progress indicator
- Toast Notifications: Success/error feedback with 3-second duration
- Professional Header: Clear branding and version display

### Workflow Enhancements
- Drag-and-Drop Alternative: File dialogs for intuitive file selection
- Batch Processing: Handle multiple files in single operations
- Visual Feedback: Grid previews, pagination controls, progress bars
- Error Handling: Graceful degradation with user-friendly error messages
- Session Persistence: Current working state maintained during operations
- Non-blocking Operations: All heavy lifting runs on worker threads

### Performance Optimizations
- Lazy Loading: Pages rendered on-demand during preview
- Thumbnails: Lightweight 100×140 pixel previews for quick display
- Threaded Operations: Non-blocking UI during processing
- Memory Efficient: Stream-based processing for large files
- File Size Validation: Maximum 500MB file limit prevents memory issues

## File Format Support

| Operation | Formats Supported |
|-----------|-------------------|
| PDF Input | *.pdf (including encrypted) |
| Image Input | *.jpg, *.png, *.jpeg, *.webp |
| Image-to-PDF | *.jpg, *.png, *.jpeg |
| Watermark Source | *.png, *.jpg |
| Output | *.pdf (all operations) |

## Technical Specifications

### System Requirements
- Python 3.7+
- 500MB available disk space
- 2GB RAM recommended

### Dependencies
- ttkbootstrap (UI framework)
- pypdf (PDF manipulation)
- pymupdf/fitz (PDF rendering)
- pillow (image processing)
- reportlab (watermark generation)
- cryptography (secure operations)
- tkinter (standard library)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/irealashu/PDF_Toolkit.git
   cd PDF_Toolkit
   ```

2. Run the builder script (automatic dependency installation):
   ```bash
   build_app_v7.bat
   ```
   
   Or install manually:
   ```bash
   pip install -r requirements.txt
   python pdf_toolkit_v7_improved.pyw
   ```

## Logging & Diagnostics
- All operations logged to `pdf_toolkit.log`
- Comprehensive error tracking for debugging
- Timestamp-based entries for audit trails
- Full stack traces for critical errors

## Development Information
- **Developer**: Ashutosh Singh
- **Email**: kshatriya205902@gmail.com
- **Portfolio**: https://irealashu.in
- **Repository**: irealashu/PDF_Toolkit
- **Language**: Python, Batchfile
- **Version**: 7.0 Pro
- **License**: Apache License 2.0

## What's New in v7.0
✅ Production-ready with comprehensive error handling  
✅ Advanced memory management and resource cleanup  
✅ Thread-safe operations with proper synchronization  
✅ Complete input validation and file existence checks  
✅ Full logging system for troubleshooting  
✅ Improved exception handling across all modules  
✅ Better UI responsiveness with worker threads  
✅ Enhanced security with cryptography support  

## Support & Contributions
For bug reports, feature requests, or contributions, please visit the GitHub repository.

---
**Status**: Actively maintained | **Last Updated**: 2026
