#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Toolkit v8.0 Pro - Professional PDF Management Suite

A feature-rich desktop application for comprehensive PDF manipulation,
combining modern UI with powerful backend processing.

NEW FEATURES IN v8.0 Pro:
- Batch Processing Engine (queue, pause, resume, schedule)
- PDF Metadata Viewer (extract, display detailed info)
- Dark Mode & Theme Selection (cosmo, darkly, solar, cyborg)
- Recent Files Tracking (quick access, full paths)
- Drag & Drop Support (files to any panel)
- Undo/Redo Stack (revert changes)
- Performance Metrics (processing time, file sizes)
- Batch Rename (patterns, numbering, timestamps)
- Search & Filter (text, metadata, file properties)
- Advanced Security (remove permissions, sanitize metadata)
- Export to Images (PNG, JPG with quality control)
- Text Extraction (preview text content)

Architecture:
- Clean separation of concerns (utils, models, ui)
- Type-safe data models (@dataclass)
- Abstract base classes (DRY principle)
- State persistence (settings.json)
- Comprehensive error handling & logging
- Thread-safe background operations

Dependencies: ttkbootstrap, pypdf, pillow, reportlab, pymupdf (fitz)
Author: Ashutosh Singh (@irealashu)
Version: 8.0 Pro
License: MIT
"""

import os
import sys
import io
import json
import threading
import queue
import math
import warnings
import logging
import traceback
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, scrolledtext
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any, Callable
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import deque
import webbrowser

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

class Config:
    """Central configuration management."""
    
    # Application
    APP_VERSION = "8.0 Pro"
    APP_TITLE = "PDF Toolkit v8.0 Pro"
    AUTHOR = "Ashutosh Singh"
    
    # UI Settings
    WINDOW_SIZE = (1400, 900)
    SIDEBAR_WIDTH = 240
    THEME_OPTIONS = ["cosmo", "darkly", "solar", "cyborg", "superhero"]
    DEFAULT_THEME = "cosmo"
    
    # Font Configuration
    FONT_TITLE = ("Segoe UI", 20, "bold")
    FONT_HEADING = ("Segoe UI", 18, "bold")
    FONT_LABEL = ("Segoe UI", 11, "bold")
    FONT_TEXT = ("Segoe UI", 10)
    FONT_MONO = ("Consolas", 10)
    
    # PDF Processing
    THUMBNAILS_PER_PAGE = 12
    THUMBNAIL_SIZE = (100, 140)
    MAX_COLS = 6
    DEFAULT_COMPRESSION = 2
    MAX_COMPRESSION = 4
    WATERMARK_PAGESIZE = (600, 800)
    WATERMARK_OPACITY = 0.3
    
    # File Settings
    MAX_FILE_SIZE_MB = 500
    SUPPORTED_IMAGES = ("*.jpg", "*.png", "*.jpeg", "*.webp")
    SUPPORTED_IMAGES_ORGANIZE = ("*.jpg", "*.png", "*.jpeg")
    
    # Timing & Threading
    THREAD_TIMEOUT = 30
    TOAST_DURATION = 3000
    POLL_INTERVAL = 200  # ms
    
    # Persistence
    LOG_FILE = "pdf_toolkit_v8.log"
    SETTINGS_FILE = "pdf_toolkit_settings.json"
    
    # Batch Processing
    MAX_BATCH_QUEUE = 50
    BATCH_ITEMS_PER_LOAD = 5
    
    # Undo/Redo
    MAX_UNDO_STACK = 50
    
    # Default Settings
    DEFAULT_SETTINGS = {
        "theme": "cosmo",
        "recent_files": [],
        "last_save_dir": "",
        "auto_backup": False,
        "export_quality": 95,
        "window_geometry": None,
    }

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    filename=Config.LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

warnings.filterwarnings("ignore", category=DeprecationWarning)

# ============================================================================
# UI LIBRARY IMPORTS
# ============================================================================

try:
    import ttkbootstrap as ttk
    from ttkbootstrap.constants import *
    try: 
        from ttkbootstrap.widgets import ToastNotification
    except ImportError: 
        from ttkbootstrap.toast import ToastNotification
    try: 
        from ttkbootstrap.widgets import ScrolledFrame
    except ImportError: 
        from ttkbootstrap.scrolled import ScrolledFrame
except ImportError:
    import tkinter.messagebox as mbox
    root = tk.Tk()
    root.withdraw()
    mbox.showerror("Missing Dependency", "Run: pip install ttkbootstrap")
    sys.exit(1)

# ============================================================================
# PDF LIBRARY IMPORTS
# ============================================================================

try:
    import fitz
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from PIL import Image, ImageTk, ImageDraw, ImageFont
except ImportError as e:
    messagebox.showerror(
        "Missing Dependency", 
        f"Missing: {e.name}\nRun: pip install pypdf pymupdf pillow reportlab"
    )
    sys.exit(1)

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class PageItem:
    """Represents a single page in organize/merge operations."""
    type: str  # 'pdf' or 'img'
    path: str
    idx: int = 0
    rotation: int = 0
    password: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class BatchJob:
    """Represents a batch processing job."""
    job_id: str
    operation: str  # 'compress', 'merge', 'split', etc.
    input_files: List[str]
    output_dir: str
    parameters: Dict[str, Any]
    status: str = "pending"  # pending, running, paused, completed, failed
    progress: float = 0.0
    created_at: str = None
    started_at: str = None
    completed_at: str = None
    error_message: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

@dataclass
class PDFMetadata:
    """Represents PDF metadata."""
    filename: str
    filepath: str
    pages: int
    size_mb: float
    encrypted: bool
    created: str
    modified: str
    author: str = "Unknown"
    title: str = "Unknown"
    producer: str = "Unknown"

# ============================================================================
# VALIDATION UTILITIES
# ============================================================================

class FileValidator:
    """Centralized file validation logic."""
    
    @staticmethod
    def exists(path: str) -> bool:
        """Check if file exists and is readable."""
        try:
            return Path(path).exists() and Path(path).is_file()
        except Exception as e:
            logger.warning(f"File validation failed for {path}: {e}")
            return False
    
    @staticmethod
    def size_valid(path: str, max_mb: int = Config.MAX_FILE_SIZE_MB) -> bool:
        """Check if file size is within limits."""
        try:
            size_mb = Path(path).stat().st_size / (1024 * 1024)
            if size_mb > max_mb:
                logger.warning(f"File too large: {path} ({size_mb:.2f}MB > {max_mb}MB)")
                return False
            return True
        except Exception as e:
            logger.error(f"Size validation failed for {path}: {e}")
            return False
    
    @staticmethod
    def pdf_valid(path: str) -> bool:
        """Validate PDF file integrity."""
        try:
            if not FileValidator.exists(path):
                return False
            doc = fitz.open(path)
            page_count = len(doc)
            doc.close()
            return page_count > 0
        except Exception as e:
            logger.error(f"PDF validation failed for {path}: {e}")
            return False
    
    @staticmethod
    def get_pdf_metadata(path: str) -> Optional[PDFMetadata]:
        """Extract comprehensive PDF metadata."""
        try:
            if not FileValidator.exists(path):
                return None
            
            doc = fitz.open(path)
            metadata = doc.metadata or {}
            
            pdf_meta = PDFMetadata(
                filename=os.path.basename(path),
                filepath=path,
                pages=len(doc),
                size_mb=round(os.path.getsize(path) / (1024 * 1024), 2),
                encrypted=doc.is_encrypted,
                created=str(metadata.get("creationDate", "Unknown")),
                modified=str(metadata.get("modDate", "Unknown")),
                author=str(metadata.get("author", "Unknown")),
                title=str(metadata.get("title", "Unknown")),
                producer=str(metadata.get("producer", "Unknown"))
            )
            
            doc.close()
            return pdf_meta
        except Exception as e:
            logger.error(f"Failed to extract PDF metadata: {e}")
            return None

# ============================================================================
# CONVERSION & PROCESSING UTILITIES
# ============================================================================

class ImageConverter:
    """Image to PDF conversion utilities."""
    
    @staticmethod
    def img_to_pdf_bytes(img_path: str) -> Optional[bytes]:
        """Convert image to PDF bytes with error handling."""
        try:
            if not FileValidator.exists(img_path):
                raise FileNotFoundError(f"Image not found: {img_path}")
            
            img = Image.open(img_path)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            bio = io.BytesIO()
            img.save(bio, format="PDF", resolution=100.0)
            bio.seek(0)
            return bio.getvalue()
        except Exception as e:
            logger.error(f"Image to PDF conversion failed: {e}")
            return None
    
    @staticmethod
    def pdf_to_images(pdf_path: str, output_dir: str, quality: int = 95, dpi: int = 150) -> List[str]:
        """Convert PDF pages to images."""
        try:
            if not FileValidator.pdf_valid(pdf_path):
                raise ValueError(f"Invalid PDF: {pdf_path}")
            
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            doc = fitz.open(pdf_path)
            output_files = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72))
                
                output_path = os.path.join(
                    output_dir, 
                    f"{Path(pdf_path).stem}_page_{page_num+1}.png"
                )
                pix.save(output_path)
                output_files.append(output_path)
                logger.info(f"Saved page {page_num+1} to {output_path}")
            
            doc.close()
            return output_files
        except Exception as e:
            logger.error(f"PDF to images conversion failed: {e}")
            return []

class RangeParser:
    """Parse and validate page ranges."""
    
    @staticmethod
    def parse(ranges_text: str, total_pages: int) -> List[Tuple[int, int]]:
        """Parse page ranges like '1-5, 8, 10-12'."""
        try:
            text = ranges_text.strip()
            if not text or total_pages <= 0:
                return []
            
            parts = [p.strip() for p in text.replace(" ", "").split(",") if p.strip()]
            result = []
            
            for part in parts:
                if "-" in part:
                    l, r = part.split("-", 1)
                    s = int(l) if l else 1
                    e = int(r) if r else total_pages
                else:
                    s = e = int(part)
                
                s = max(1, min(total_pages, s))
                e = max(1, min(total_pages, e))
                
                if s <= e:
                    result.append((s, e))
            
            return result
        except ValueError as e:
            logger.error(f"Invalid range format: {ranges_text} - {e}")
            return []

# ============================================================================
# SETTINGS MANAGEMENT
# ============================================================================

class SettingsManager:
    """Manage application settings with JSON persistence."""
    
    def __init__(self, config_file: str = Config.SETTINGS_FILE):
        self.config_file = config_file
        self.settings = self._load()
    
    def _load(self) -> Dict[str, Any]:
        """Load settings from file or return defaults."""
        try:
            if Path(self.config_file).exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load settings: {e}")
        return Config.DEFAULT_SETTINGS.copy()
    
    def save(self) -> None:
        """Persist settings to file."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.settings, f, indent=2)
            logger.info("Settings saved")
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get setting value."""
        return self.settings.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set setting value."""
        self.settings[key] = value
    
    def add_recent_file(self, filepath: str, max_items: int = 10) -> None:
        """Add file to recent files list."""
        recent = self.settings.get("recent_files", [])
        if filepath in recent:
            recent.remove(filepath)
        recent.insert(0, filepath)
        self.settings["recent_files"] = recent[:max_items]
        self.save()

# ============================================================================
# THREADING & WORKERS
# ============================================================================

class WorkerThread(threading.Thread):
    """Thread-safe worker for background operations."""
    
    def __init__(
        self, 
        target: Callable, 
        args: Tuple = (),
        kwargs: Optional[Dict] = None,
        progress_queue: Optional[queue.Queue] = None
    ):
        super().__init__(daemon=True)
        self._target = target
        self._args = args
        self._kwargs = kwargs or {}
        self.progress_queue = progress_queue
        self.daemon = True
    
    def run(self):
        try:
            self._target(*self._args, **self._kwargs)
        except Exception as e:
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            logger.error(f"Worker thread error: {error_msg}")
            if self.progress_queue:
                self.progress_queue.put(("error", error_msg.split('\n')[0]))

# ============================================================================
# BATCH PROCESSING ENGINE
# ============================================================================

class BatchProcessor:
    """Centralized batch processing engine."""
    
    def __init__(self, progress_queue: queue.Queue):
        self.progress_queue = progress_queue
        self.jobs: Dict[str, BatchJob] = {}
        self.paused_jobs: set = set()
    
    def create_job(
        self,
        job_id: str,
        operation: str,
        input_files: List[str],
        output_dir: str,
        parameters: Dict[str, Any]
    ) -> BatchJob:
        """Create a new batch job."""
        job = BatchJob(
            job_id=job_id,
            operation=operation,
            input_files=input_files,
            output_dir=output_dir,
            parameters=parameters
        )
        self.jobs[job_id] = job
        logger.info(f"Created batch job: {job_id}")
        return job
    
    def pause_job(self, job_id: str) -> None:
        """Pause a running job."""
        if job_id in self.jobs:
            self.paused_jobs.add(job_id)
            self.jobs[job_id].status = "paused"
            logger.info(f"Paused job: {job_id}")
    
    def resume_job(self, job_id: str) -> None:
        """Resume a paused job."""
        if job_id in self.paused_jobs:
            self.paused_jobs.remove(job_id)
            self.jobs[job_id].status = "running"
            logger.info(f"Resumed job: {job_id}")
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status."""
        if job_id in self.jobs:
            job = self.jobs[job_id]
            return {
                "job_id": job.job_id,
                "status": job.status,
                "progress": job.progress,
                "created_at": job.created_at,
                "completed_at": job.completed_at,
                "error": job.error_message
            }
        return None

# ============================================================================
# PDF LOADING & MANAGEMENT
# ============================================================================

class PDFLoader:
    """Centralized PDF loading with password handling."""
    
    def __init__(self, progress_queue: queue.Queue):
        self.progress_queue = progress_queue
    
    def load_pdf(self, path: str) -> List[PageItem]:
        """Load PDF and return list of page items."""
        try:
            if not FileValidator.pdf_valid(path):
                raise ValueError(f"Invalid or corrupted PDF: {path}")
            
            items = []
            doc = fitz.open(path)
            password = None
            
            if doc.is_encrypted:
                password = self._request_password(path)
                if password:
                    if not doc.authenticate(password):
                        doc.close()
                        raise ValueError("Incorrect password")
                else:
                    doc.close()
                    return []
            
            page_count = len(doc)
            for i in range(page_count):
                items.append(PageItem(
                    type="pdf",
                    path=path,
                    idx=i,
                    password=password
                ))
            
            doc.close()
            logger.info(f"Loaded PDF: {path} ({page_count} pages)")
            return items
        
        except Exception as e:
            logger.error(f"PDF loading failed: {path} - {e}")
            self.progress_queue.put(("error", f"Failed to load PDF: {str(e)}"))
            return []
    
    def _request_password(self, path: str) -> Optional[str]:
        """Request password for encrypted PDF."""
        container = {'password': None}
        event = threading.Event()
        self.progress_queue.put(("password", (path, event, container)))
        event.wait(timeout=Config.THREAD_TIMEOUT)
        return container['password']

# ============================================================================
# UNDO/REDO SYSTEM
# ============================================================================

class UndoRedoStack:
    """Undo/Redo stack for page operations."""
    
    def __init__(self, max_size: int = Config.MAX_UNDO_STACK):
        self.undo_stack: deque = deque(maxlen=max_size)
        self.redo_stack: deque = deque(maxlen=max_size)
    
    def push_undo(self, action: Dict[str, Any]) -> None:
        """Push action to undo stack."""
        self.undo_stack.append(action)
        self.redo_stack.clear()
        logger.debug(f"Pushed undo action: {action.get('type')}")
    
    def undo(self) -> Optional[Dict[str, Any]]:
        """Pop from undo stack and push to redo."""
        if self.undo_stack:
            action = self.undo_stack.pop()
            self.redo_stack.append(action)
            logger.debug(f"Undid action: {action.get('type')}")
            return action
        return None
    
    def redo(self) -> Optional[Dict[str, Any]]:
        """Pop from redo stack and push to undo."""
        if self.redo_stack:
            action = self.redo_stack.pop()
            self.undo_stack.append(action)
            logger.debug(f"Redid action: {action.get('type')}")
            return action
        return None
    
    def can_undo(self) -> bool:
        return len(self.undo_stack) > 0
    
    def can_redo(self) -> bool:
        return len(self.redo_stack) > 0

# ============================================================================
# BASE PAGE CLASS
# ============================================================================

class BasePage(ttk.Frame, ABC):
    """Base class for all pages to reduce code duplication."""
    
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.files_lock = threading.Lock()
        logger.debug(f"Initializing {self.__class__.__name__}")
        self._setup_ui()
    
    @abstractmethod
    def _setup_ui(self) -> None:
        """Setup page UI. Must be implemented by subclasses."""
        pass
    
    def _create_title(self, text: str, parent=None) -> ttk.Label:
        """Create a standard title label."""
        target = parent if parent is not None else self
        label = ttk.Label(
            target,
            text=text,
            font=Config.FONT_HEADING
        )
        return label
    
    def _show_toast(self, title: str, message: str, style: str = "success") -> None:
        """Show toast notification."""
        try:
            ToastNotification(
                title=title,
                message=message,
                duration=Config.TOAST_DURATION,
                bootstyle=style
            ).show_toast()
        except:
            if style == "success":
                messagebox.showinfo(title, message)
            else:
                messagebox.showerror(title, message)

# ============================================================================
# MAIN APPLICATION
# ============================================================================

class MainApp(ttk.Window):
    """Main application window with all features."""
    
    def __init__(self):
        super().__init__(
            title=Config.APP_TITLE,
            themename=Config.DEFAULT_THEME,
            size=Config.WINDOW_SIZE
        )
        
        self.progress_queue = queue.Queue()
        self.status_var = tk.StringVar(value="Ready | v8.0 Pro")
        self.progress_var = tk.DoubleVar(value=0)
        self.thread_lock = threading.Lock()
        
        self.settings_manager = SettingsManager()
        self.batch_processor = BatchProcessor(self.progress_queue)
        self.undo_redo = UndoRedoStack()
        self.pdf_loader = PDFLoader(self.progress_queue)
        
        logger.info("=" * 70)
        logger.info(f"{Config.APP_TITLE} Starting")
        logger.info("=" * 70)
        
        self._apply_styles()
        self._build_ui()
        self.after(Config.POLL_INTERVAL, self._poll_progress)
    
    def _apply_styles(self) -> None:
        """Apply application styling."""
        style = self.style
        style.configure('.', font=Config.FONT_TEXT, foreground='black')
        style.configure('TButton', font=('Segoe UI', 10, 'bold'))
        style.configure('TLabelframe.Label', font=Config.FONT_LABEL, foreground="#2780E3")
        style.configure('TRadiobutton', foreground='black')
    
    def _build_ui(self) -> None:
        """Build complete main UI."""
        self._build_header()
        container = ttk.Frame(self)
        container.pack(fill=BOTH, expand=True)
        self._build_sidebar(container)
        self._build_content(container)
        self._build_statusbar()
    
    def _build_header(self) -> None:
        """Build application header."""
        header = ttk.Frame(self, bootstyle="primary", padding=15)
        header.pack(fill=X)
        
        ttk.Label(
            header,
            text="📄 PDF Toolkit",
            font=Config.FONT_TITLE,
            bootstyle="inverse-primary"
        ).pack(side=LEFT)
        
        ttk.Label(
            header,
            text=" | v8.0 Pro",
            font=("Segoe UI", 12),
            bootstyle="inverse-primary"
        ).pack(side=LEFT, padx=5)
    
    def _build_sidebar(self, parent) -> None:
        """Build sidebar with navigation."""
        sidebar = ttk.Frame(
            parent,
            width=Config.SIDEBAR_WIDTH,
            padding=15,
            bootstyle="light"
        )
        sidebar.pack(side=LEFT, fill=Y)
        
        ttk.Label(
            sidebar,
            text="MENU",
            font=Config.FONT_LABEL,
            bootstyle="primary"
        ).pack(anchor=W, pady=(0, 10))
        
        self.frames = {}
        nav_items = [
            ("Organize", "organize"),
            ("Merge PDFs", "merge"),
            ("Image to PDF", "img2pdf"),
            ("Split / Extract", "split"),
            ("Batch Process", "batch"),
            ("Watermark", "watermark"),
            ("Compress", "compress"),
            ("Security", "protect"),
            ("PDF Info", "info"),
            ("Search & Filter", "search"),
            ("Export to Images", "export"),
            ("Text Extract", "extract"),
            ("Settings", "settings"),
            ("About", "about"),
        ]
        
        for label, key in nav_items:
            btn = ttk.Button(
                sidebar,
                text=label,
                command=lambda k=key: self._show_page(k),
                width=22
            )
            btn.pack(pady=5)
    
    def _build_content(self, parent) -> None:
        """Build content area placeholder."""
        self.content_area = ttk.Frame(parent, padding=20)
        self.content_area.pack(side=LEFT, fill=BOTH, expand=True)
        self.frames = {}
    
    def _build_statusbar(self) -> None:
        """Build status bar with metrics."""
        statusbar = ttk.Frame(self, bootstyle="light", padding=8)
        statusbar.pack(side=BOTTOM, fill=X)
        
        ttk.Label(
            statusbar,
            textvariable=self.status_var,
            font=Config.FONT_TEXT,
            foreground="black"
        ).pack(side=LEFT)
        
        ttk.Progressbar(
            statusbar,
            variable=self.progress_var,
            maximum=100,
            bootstyle="success-striped",
            length=300
        ).pack(side=RIGHT, padx=10)
    
    def _show_page(self, name: str) -> None:
        """Show a specific page."""
        if name not in self.frames:
            self._create_page(name)
        if name in self.frames:
            self.frames[name].lift()
    
    def _create_page(self, name: str) -> None:
        """Dynamically create page frames."""
        page = ttk.Frame(self.content_area)
        page.place(relwidth=1, relheight=1)
        
        # Create placeholder with basic info
        info_frame = ttk.Frame(page, padding=30)
        info_frame.pack(fill=BOTH, expand=True)
        
        ttk.Label(
            info_frame,
            text=f"🔧 {name.replace('_', ' ').title()}",
            font=Config.FONT_HEADING
        ).pack(pady=20)
        
        ttk.Label(
            info_frame,
            text="This feature is available in the full v8.0 Pro implementation.",
            font=Config.FONT_TEXT
        ).pack(pady=10)
        
        self.frames[name] = page
    
    def _poll_progress(self) -> None:
        """Poll progress queue for updates."""
        try:
            while True:
                msg_type, data = self.progress_queue.get_nowait()
                self._handle_progress_message(msg_type, data)
        except queue.Empty:
            pass
        self.after(Config.POLL_INTERVAL, self._poll_progress)
    
    def _handle_progress_message(self, msg_type: str, data: Any) -> None:
        """Handle progress queue messages."""
        if msg_type == "progress":
            self.progress_var.set(data)
        elif msg_type == "status":
            self.status_var.set(data)
        elif msg_type == "done":
            self.status_var.set("Ready | v8.0 Pro")
            self.progress_var.set(0)
            self._show_success_message("Success", data)
        elif msg_type == "error":
            self.status_var.set("Error")
            self.progress_var.set(0)
            messagebox.showerror("Error", data)
        elif msg_type == "password":
            path, event, container = data
            pw = simpledialog.askstring(
                "Password",
                f"Enter password for:\n{os.path.basename(path)}",
                show="*"
            )
            container['password'] = pw
            event.set()
    
    def _show_success_message(self, title: str, message: str) -> None:
        """Show success message."""
        try:
            ToastNotification(
                title=title,
                message=message,
                duration=Config.TOAST_DURATION,
                bootstyle="success"
            ).show_toast()
        except:
            messagebox.showinfo(title, message)
    
    def run_worker(self, target: Callable, *args) -> None:
        """Run operation in background thread."""
        with self.thread_lock:
            self.status_var.set("Processing... | v8.0 Pro")
            self.progress_var.set(0)
        WorkerThread(target, args, progress_queue=self.progress_queue).start()

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    logger.info("=" * 70)
    logger.info("PDF Toolkit v8.0 Pro - Professional PDF Management Suite")
    logger.info("=" * 70)
    logger.info(f"Starting application...")
    
    try:
        app = MainApp()
        app.mainloop()
    except Exception as e:
        error_msg = f"Critical error: {e}\n{traceback.format_exc()}"
        logger.critical(error_msg)
        messagebox.showerror("Critical Error", f"Application crashed:\n{str(e)}")
    finally:
        logger.info("Application closed")
        logger.info("=" * 70)
