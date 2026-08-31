#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Toolkit v7.0 - Improved & Production-Ready
Changes from v6:
- Comprehensive error handling with logging
- Memory management & resource cleanup
- Eliminated code duplication
- Thread-safe operations with locks
- Input validation & file existence checks
- Performance optimizations
- Better exception handling across all modules
- Configuration management with constants
- Improved file validation and size checks

Dependencies: ttkbootstrap, pypdf, pillow, reportlab, pymupdf (fitz).
"""

import os
import sys
import io
import threading
import queue
import math
import warnings
import logging
import traceback
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog
import webbrowser
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# --- Configuration Constants ---
class Config:
    THUMBNAILS_PER_PAGE = 12
    THUMBNAIL_SIZE = (100, 140)
    MAX_COLS = 6
    TOAST_DURATION = 3000
    DEFAULT_COMPRESSION_LEVEL = 2
    MAX_COMPRESSION_LEVEL = 4
    WATERMARK_PAGESIZE = (600, 800)
    WATERMARK_OPACITY = 0.3
    THREAD_TIMEOUT = 30
    MAX_FILE_SIZE_MB = 500
    LOG_FILE = "pdf_toolkit.log"
    SUPPORTED_IMAGES = ("*.jpg", "*.png", "*.jpeg", "*.webp")
    SUPPORTED_IMAGES_ORGANIZE = ("*.jpg", "*.png", "*.jpeg")

# --- Logging Setup ---
logging.basicConfig(
    filename=Config.LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# --- 1. Suppress Warnings ---
warnings.filterwarnings("ignore", category=DeprecationWarning)

# --- 2. Modern UI Library ---
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

# --- 3. Functional Dependencies ---
try:
    import fitz  # pymupdf
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from PIL import Image, ImageTk
except ImportError as e:
    messagebox.showerror(
        "Missing Dependency", 
        f"Missing: {e.name}\nRun: pip install pypdf pymupdf pillow reportlab"
    )
    sys.exit(1)

APP_TITLE = "PDF Toolkit v7.0"

# --- Validation Utilities ---
def validate_file_exists(path: str) -> bool:
    """Check if file exists and is readable."""
    try:
        return Path(path).exists() and Path(path).is_file()
    except Exception as e:
        logger.warning(f"File validation failed for {path}: {e}")
        return False

def validate_file_size(path: str, max_mb: int = Config.MAX_FILE_SIZE_MB) -> bool:
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

def validate_pdf(path: str) -> bool:
    """Validate PDF file integrity."""
    try:
        if not validate_file_exists(path):
            return False
        doc = fitz.open(path)
        doc.close()
        return True
    except Exception as e:
        logger.error(f"PDF validation failed for {path}: {e}")
        return False

# --- Logic Utilities ---
def img_to_pdf_bytes(img_path: str) -> Optional[bytes]:
    """Convert image to PDF bytes with error handling."""
    try:
        if not validate_file_exists(img_path):
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

def parse_ranges(ranges_text: str, total_pages: int) -> List[Tuple[int, int]]:
    """Parse page ranges with validation."""
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

# --- Worker Thread ---
class WorkerThread(threading.Thread):
    """Thread-safe worker for background operations."""
    def __init__(self, target, args=(), kwargs=None, progress_queue=None):
        super().__init__(daemon=True)
        self._target = target
        self._args = args
        self._kwargs = kwargs or {}
        self.q = progress_queue
        self.daemon = True

    def run(self):
        try:
            self._target(*self._args, **self._kwargs)
        except Exception as e:
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            logger.error(f"Worker thread error: {error_msg}")
            if self.q:
                self.q.put(("error", error_msg.split('\n')[0]))

# --- Main Application ---
class MainApp(ttk.Window):
    def __init__(self):
        super().__init__(title=APP_TITLE, themename="cosmo", size=(1280, 900))
        
        self.progress_queue = queue.Queue()
        self.status_var = tk.StringVar(value="Ready")
        self.progress_var = tk.DoubleVar(value=0)
        self.thread_lock = threading.Lock()
        
        logger.info("Application started")
        self._apply_styles()

        # Header
        self.header = ttk.Frame(self, bootstyle="primary", padding=15)
        self.header.pack(fill=X)
        self.lbl_title = ttk.Label(
            self.header, 
            text="PDF Toolkit", 
            font=("Segoe UI", 20, "bold"), 
            bootstyle="inverse-primary"
        )
        self.lbl_title.pack(side=LEFT)
        self.lbl_ver = ttk.Label(
            self.header, 
            text=" | v7.0 Pro", 
            font=("Segoe UI", 12), 
            bootstyle="inverse-primary"
        )
        self.lbl_ver.pack(side=LEFT, pady=(8, 0), padx=5)

        # Container
        container = ttk.Frame(self)
        container.pack(fill=BOTH, expand=True)

        # Sidebar
        self.sidebar = ttk.Frame(container, width=240, padding=15, bootstyle="light")
        self.sidebar.pack(side=LEFT, fill=Y)
        
        self.lbl_menu = ttk.Label(
            self.sidebar, 
            text="MENU", 
            font=("Segoe UI", 11, "bold"), 
            bootstyle="primary"
        )
        self.lbl_menu.pack(anchor=W, pady=(0, 10))
        
        self.frames = {}
        nav_items = [
            ("Organize", self.show_organize, "primary"),
            ("Merge PDFs", self.show_merge, "primary"),
            ("Image to PDF", self.show_img2pdf, "primary"),
            ("Split / Extract", self.show_split, "primary"),
            ("Watermark", self.show_watermark, "primary"),
            ("Compress", self.show_compress, "primary"),
            ("Security", self.show_protect, "primary"),
            ("About", self.show_about, "primary"),
        ]
        
        for lbl, cmd, style in nav_items:
            btn = ttk.Button(self.sidebar, text=lbl, command=cmd, bootstyle=style, width=22)
            btn.pack(pady=6)

        # Content
        content_area = ttk.Frame(container, padding=20)
        content_area.pack(side=LEFT, fill=BOTH, expand=True)
        self.frames['organize'] = OrganizePage(content_area, self)
        self.frames['merge'] = MergePage(content_area, self)
        self.frames['img2pdf'] = ImageToPdfPage(content_area, self)
        self.frames['split'] = SplitPage(content_area, self)
        self.frames['watermark'] = WatermarkPage(content_area, self)
        self.frames['compress'] = CompressPage(content_area, self)
        self.frames['protect'] = ProtectPage(content_area, self)
        self.frames['about'] = AboutPage(content_area, self)
        for f in self.frames.values():
            f.place(relwidth=1, relheight=1)

        # Status
        statusbar = ttk.Frame(self, bootstyle="light", padding=8)
        statusbar.pack(side=BOTTOM, fill=X)
        ttk.Label(
            statusbar, 
            textvariable=self.status_var, 
            font=("Segoe UI", 9), 
            foreground="black"
        ).pack(side=LEFT)
        ttk.Progressbar(
            statusbar, 
            variable=self.progress_var, 
            maximum=100, 
            bootstyle="success-striped", 
            length=300
        ).pack(side=RIGHT, padx=10)

        self.show_organize()
        self.after(200, self._poll_progress)

    def _apply_styles(self):
        self.style.configure('.', font=('Segoe UI', 10), foreground='black')
        self.style.configure('TButton', font=('Segoe UI', 10, 'bold'))
        self.style.configure('TLabelframe.Label', font=('Segoe UI', 11, 'bold'), foreground="#2780E3")
        self.style.configure('TRadiobutton', foreground='black')

    def _poll_progress(self):
        try:
            while True:
                typ, data = self.progress_queue.get_nowait()
                if typ == "progress":
                    self.progress_var.set(data)
                elif typ == "status":
                    self.status_var.set(data)
                elif typ == "done":
                    self.status_var.set("Ready")
                    self.progress_var.set(0)
                    try:
                        ToastNotification(
                            title="Success", 
                            message=data, 
                            duration=Config.TOAST_DURATION, 
                            bootstyle="success"
                        ).show_toast()
                    except:
                        messagebox.showinfo("Success", data)
                elif typ == "error":
                    self.status_var.set("Error")
                    self.progress_var.set(0)
                    messagebox.showerror("Error", data)
                elif typ == "password":
                    path, evt, container = data
                    pw = simpledialog.askstring(
                        "Password", 
                        f"Enter password for:\n{os.path.basename(path)}", 
                        show="*"
                    )
                    container['password'] = pw
                    evt.set()
        except queue.Empty:
            pass
        self.after(200, self._poll_progress)

    def run_worker(self, target, *args):
        with self.thread_lock:
            self.status_var.set("Processing...")
            self.progress_var.set(0)
        WorkerThread(target, args, progress_queue=self.progress_queue).start()

    def show_organize(self):
        self._lift('organize')
    def show_merge(self):
        self._lift('merge')
    def show_img2pdf(self):
        self._lift('img2pdf')
    def show_split(self):
        self._lift('split')
    def show_watermark(self):
        self._lift('watermark')
    def show_compress(self):
        self._lift('compress')
    def show_protect(self):
        self._lift('protect')
    def show_about(self):
        self._lift('about')

    def _lift(self, name):
        self.frames[name].lift()

# --- PDF Loading Helper ---
class PDFLoader:
    """Centralized PDF loading with password handling."""
    
    def __init__(self, progress_queue):
        self.q = progress_queue
    
    def load_pdf(self, path: str) -> List[Dict]:
        """Load PDF and return list of page metadata."""
        try:
            if not validate_pdf(path):
                raise ValueError(f"Invalid or corrupted PDF: {path}")
            
            new_items = []
            doc = fitz.open(path)
            pw = None
            
            if doc.is_encrypted:
                c = {'password': None}
                e = threading.Event()
                self.q.put(("password", (path, e, c)))
                e.wait()
                pw = c['password']
                if pw:
                    if not doc.authenticate(pw):
                        doc.close()
                        raise ValueError("Incorrect password")
                else:
                    doc.close()
                    return []
            
            page_count = len(doc)
            for i in range(page_count):
                new_items.append({
                    "type": "pdf",
                    "path": path,
                    "idx": i,
                    "rot": 0,
                    "pw": pw
                })
            
            doc.close()
            logger.info(f"Loaded PDF: {path} ({page_count} pages)")
            return new_items
        
        except Exception as e:
            logger.error(f"PDF loading failed: {path} - {e}")
            self.q.put(("error", f"Failed to load PDF: {str(e)}"))
            return []

# --- Pages ---

class ImageToPdfPage(ttk.Frame):
    """Dedicated section for Image to PDF conversion."""
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.files = []
        self.files_lock = threading.Lock()
        
        ttk.Label(
            self, 
            text="Image to PDF Converter", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 15))
        
        f = ttk.Frame(self)
        f.pack(fill=BOTH, expand=True)
        self.lst = tk.Listbox(
            f, 
            font=("Consolas", 11), 
            borderwidth=0, 
            highlightthickness=0, 
            bg="white", 
            fg="black", 
            selectbackground="#2780E3"
        )
        self.lst.pack(side=LEFT, fill=BOTH, expand=True)
        
        ctl = ttk.Frame(self)
        ctl.pack(fill=X, pady=15)
        ttk.Button(ctl, text="Add Images", command=self.add, bootstyle="primary").pack(side=LEFT, padx=5)
        ttk.Button(ctl, text="Clear List", command=self.clr, bootstyle="danger").pack(side=LEFT, padx=5)
        ttk.Button(ctl, text="Convert to PDF", command=self.run, bootstyle="success").pack(side=RIGHT, padx=5)
    
    def add(self):
        try:
            ps = filedialog.askopenfilenames(
                filetypes=[("Images", ";".join(Config.SUPPORTED_IMAGES))]
            )
            with self.files_lock:
                for p in ps:
                    if validate_file_exists(p) and validate_file_size(p, 100):
                        self.files.append(p)
                        self.lst.insert(tk.END, os.path.basename(p))
        except Exception as e:
            logger.error(f"Failed to add images: {e}")
            messagebox.showerror("Error", f"Failed to add images: {str(e)}")
    
    def clr(self):
        with self.files_lock:
            self.files = []
        self.lst.delete(0, tk.END)
    
    def run(self):
        with self.files_lock:
            if not self.files:
                messagebox.showwarning("Warning", "Please add at least one image")
                return
            files_copy = self.files.copy()
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")], 
            initialfile="images_combined.pdf"
        )
        if not out:
            return
        
        def job():
            try:
                w = PdfWriter()
                for i, f in enumerate(files_copy):
                    self.app.progress_queue.put(("status", f"Converting {os.path.basename(f)}"))
                    self.app.progress_queue.put(("progress", i / len(files_copy) * 100))
                    
                    pdf_bytes = img_to_pdf_bytes(f)
                    if not pdf_bytes:
                        raise ValueError(f"Failed to convert image: {f}")
                    
                    r = PdfReader(io.BytesIO(pdf_bytes))
                    w.add_page(r.pages[0])
                
                with open(out, "wb") as o:
                    w.write(o)
                
                self.app.progress_queue.put(("done", "Conversion Successful"))
                logger.info(f"Image to PDF completed: {out}")
            except Exception as e:
                logger.error(f"Image to PDF conversion error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class OrganizePage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.meta = []
        self.page_idx = 0
        self.per_page = Config.THUMBNAILS_PER_PAGE
        self.loader = PDFLoader(app.progress_queue)
        self.meta_lock = threading.Lock()
        
        tb = ttk.Frame(self)
        tb.pack(fill=X, pady=(0, 15))
        ttk.Button(tb, text="📂 Open PDF", command=self.load_clear, bootstyle="primary").pack(side=LEFT, padx=5)
        ttk.Button(tb, text="🖼️ Add Images", command=self.add_img, bootstyle="primary").pack(side=LEFT, padx=5)
        ttk.Button(tb, text="💾 Save Result", command=self.save, bootstyle="success").pack(side=RIGHT, padx=5)
        
        pg = ttk.Frame(self)
        pg.pack(fill=X, pady=5)
        self.btn_prev = ttk.Button(pg, text="< Prev", command=self.prev, state=DISABLED, bootstyle="link")
        self.btn_prev.pack(side=LEFT)
        self.lbl_pg = ttk.Label(pg, text="Page 1 / 1", font=("Segoe UI", 11, "bold"))
        self.lbl_pg.pack(side=LEFT, padx=15)
        self.btn_next = ttk.Button(pg, text="Next >", command=self.next, state=DISABLED, bootstyle="link")
        self.btn_next.pack(side=LEFT)
        
        self.scroll = ScrolledFrame(self, autohide=True)
        self.scroll.pack(fill=BOTH, expand=True, pady=10)
        self.grid_frame = self.scroll

    def load_clear(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p:
            with self.meta_lock:
                self.meta = []
            self.app.run_worker(self._ingest, [p])

    def add_img(self):
        try:
            ps = filedialog.askopenfilenames(
                filetypes=[("Images", ";".join(Config.SUPPORTED_IMAGES_ORGANIZE))]
            )
            if ps:
                new_items = []
                for p in ps:
                    if validate_file_exists(p):
                        new_items.append({"type": "img", "path": p, "idx": 0, "rot": 0})
                
                with self.meta_lock:
                    self.meta.extend(new_items)
                self.refresh()
        except Exception as e:
            logger.error(f"Failed to add images: {e}")
            messagebox.showerror("Error", f"Failed to add images: {str(e)}")

    def insert_pdf_at(self, insert_idx):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if not p:
            return
        self.app.run_worker(self._ingest_insert, [p], insert_idx + 1)

    def _ingest_insert(self, paths, insert_idx):
        new = self.loader.load_pdf(paths[0])
        self.after(0, lambda: self._splice_meta(new, insert_idx))

    def _splice_meta(self, new_items, index):
        if not new_items:
            return
        with self.meta_lock:
            self.meta[index:index] = new_items
        self.refresh()

    def _ingest(self, paths):
        new = self.loader.load_pdf(paths[0])
        self.after(0, lambda: self._add_meta(new))

    def _add_meta(self, new):
        with self.meta_lock:
            self.meta.extend(new)
        self.refresh()
    
    def refresh(self):
        with self.meta_lock:
            total = len(self.meta)
        
        if total == 0:
            for w in self.grid_frame.winfo_children():
                w.destroy()
            self.lbl_pg.config(text="0 / 0")
            return
        
        pages = math.ceil(total / self.per_page)
        self.page_idx = max(0, min(self.page_idx, pages - 1))
        self.lbl_pg.config(text=f"Page {self.page_idx+1} / {pages} (Total: {total})")
        self.btn_prev.config(state=NORMAL if self.page_idx > 0 else DISABLED)
        self.btn_next.config(state=NORMAL if self.page_idx < pages - 1 else DISABLED)
        
        for w in self.grid_frame.winfo_children():
            w.destroy()
        
        s = self.page_idx * self.per_page
        with self.meta_lock:
            batch = self.meta[s:min(s + self.per_page, total)]
        
        self.app.run_worker(self._render, batch, s)

    def _render(self, batch, start_idx):
        cards = []
        for i, m in enumerate(batch):
            try:
                if m['type'] == 'img':
                    im = Image.open(m['path'])
                else:
                    doc = fitz.open(m['path'])
                    if m.get('pw'):
                        doc.authenticate(m['pw'])
                    pix = doc[m['idx']].get_pixmap(matrix=fitz.Matrix(0.2, 0.2))
                    im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    doc.close()
                
                if m['rot']:
                    im = im.rotate(-m['rot'], expand=True)
                
                im.thumbnail(Config.THUMBNAIL_SIZE)
                cards.append((start_idx + i, im))
            except Exception as e:
                logger.warning(f"Failed to render thumbnail for item {i}: {e}")
        
        self.after(0, lambda: self._show_cards(cards))

    def _show_cards(self, cards):
        r, c = 0, 0
        for idx, im in cards:
            f = ttk.Frame(self.grid_frame, bootstyle="light", padding=5)
            f.grid(row=r, column=c, padx=4, pady=10)
            
            photo = ImageTk.PhotoImage(im)
            l = ttk.Label(f, image=photo)
            l.image = photo
            l.pack()
            
            ttk.Label(f, text=f"Page {idx+1}", font=("Segoe UI", 9)).pack(pady=(2, 0))
            
            b = ttk.Frame(f)
            b.pack(fill=X, pady=(5, 0))
            ttk.Button(b, text="↻", command=lambda x=idx: self.rot(x), bootstyle="primary", width=3).pack(side=LEFT, padx=1)
            ttk.Button(b, text="+", command=lambda x=idx: self.insert_pdf_at(x), bootstyle="primary", width=3).pack(side=LEFT, padx=1)
            ttk.Button(b, text="🗑", command=lambda x=idx: self.rem(x), bootstyle="danger", width=3).pack(side=LEFT, padx=1)
            
            c += 1
            if c >= Config.MAX_COLS:
                c = 0
                r += 1

    def rot(self, idx):
        with self.meta_lock:
            if idx < len(self.meta):
                self.meta[idx]['rot'] = (self.meta[idx]['rot'] + 90) % 360
        self.refresh()

    def rem(self, idx):
        with self.meta_lock:
            if idx < len(self.meta):
                del self.meta[idx]
        self.refresh()

    def prev(self):
        self.page_idx -= 1
        self.refresh()

    def next(self):
        self.page_idx += 1
        self.refresh()

    def save(self):
        with self.meta_lock:
            if not self.meta:
                messagebox.showwarning("Warning", "No pages to save")
                return
            meta_copy = self.meta.copy()
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        def job():
            try:
                w = PdfWriter()
                readers = {}
                total = len(meta_copy)
                
                for i, m in enumerate(meta_copy):
                    self.app.progress_queue.put(("status", f"Saving page {i+1}/{total}"))
                    self.app.progress_queue.put(("progress", i / total * 100))
                    
                    if m['type'] == 'img':
                        pdf_bytes = img_to_pdf_bytes(m['path'])
                        if not pdf_bytes:
                            continue
                        r = PdfReader(io.BytesIO(pdf_bytes))
                        p = r.pages[0]
                        if m['rot']:
                            p.rotate(m['rot'])
                        w.add_page(p)
                    else:
                        if m['path'] not in readers:
                            readers[m['path']] = PdfReader(m['path'])
                            if m.get('pw'):
                                readers[m['path']].decrypt(m['pw'])
                        
                        p = readers[m['path']].pages[m['idx']]
                        if m['rot']:
                            p.rotate(m['rot'])
                        w.add_page(p)
                
                with open(out, "wb") as f:
                    w.write(f)
                
                self.app.progress_queue.put(("done", f"Saved to {out}"))
                logger.info(f"Organize page saved: {out}")
            except Exception as e:
                logger.error(f"Save error in Organize: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class MergePage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.files = []
        self.files_lock = threading.Lock()
        
        ttk.Label(
            self, 
            text="Merge Documents (PDFs Only)", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 15))
        
        f = ttk.Frame(self)
        f.pack(fill=BOTH, expand=True)
        self.lst = tk.Listbox(
            f, 
            font=("Consolas", 11), 
            borderwidth=0, 
            highlightthickness=0, 
            bg="white", 
            fg="black", 
            selectbackground="#2780E3"
        )
        self.lst.pack(side=LEFT, fill=BOTH, expand=True)
        
        ctl = ttk.Frame(self)
        ctl.pack(fill=X, pady=15)
        ttk.Button(ctl, text="Add PDFs", command=self.add, bootstyle="primary").pack(side=LEFT, padx=5)
        ttk.Button(ctl, text="Clear List", command=self.clr, bootstyle="danger").pack(side=LEFT, padx=5)
        ttk.Button(ctl, text="Merge Now", command=self.run, bootstyle="success").pack(side=RIGHT, padx=5)
    
    def add(self):
        try:
            ps = filedialog.askopenfilenames(filetypes=[("PDF", "*.pdf")])
            with self.files_lock:
                for p in ps:
                    if validate_pdf(p):
                        self.files.append(p)
                        self.lst.insert(tk.END, os.path.basename(p))
        except Exception as e:
            logger.error(f"Failed to add PDFs: {e}")
            messagebox.showerror("Error", f"Failed to add PDFs: {str(e)}")

    def clr(self):
        with self.files_lock:
            self.files = []
        self.lst.delete(0, tk.END)

    def run(self):
        with self.files_lock:
            if not self.files:
                messagebox.showwarning("Warning", "Please add at least one PDF")
                return
            files_copy = self.files.copy()
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        def job():
            try:
                m = PdfWriter()
                for i, f in enumerate(files_copy):
                    self.app.progress_queue.put(("status", f"Merging {os.path.basename(f)}"))
                    self.app.progress_queue.put(("progress", i / len(files_copy) * 100))
                    m.append(f)
                
                with open(out, "wb") as o:
                    m.write(o)
                
                self.app.progress_queue.put(("done", "Merged Successfully"))
                logger.info(f"Merge completed: {out}")
            except Exception as e:
                logger.error(f"Merge error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class CompressPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.path = None
        
        ttk.Label(
            self, 
            text="Compress PDF", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 20))
        
        f = ttk.Labelframe(self, text="Input", padding=15)
        f.pack(fill=X, pady=10)
        ttk.Button(f, text="Select PDF", command=self.pick, bootstyle="primary").pack(side=LEFT)
        self.lbl = ttk.Label(f, text="No file selected", font=("Segoe UI", 10, "italic"))
        self.lbl.pack(side=LEFT, padx=15)
        
        f2 = ttk.Labelframe(self, text="Settings", padding=15)
        f2.pack(fill=X, pady=15)
        self.mode = tk.IntVar(value=Config.DEFAULT_COMPRESSION_LEVEL)
        ttk.Radiobutton(
            f2, 
            text="Standard Compression (Balanced)", 
            variable=self.mode, 
            value=2, 
            bootstyle="primary-toolbutton"
        ).pack(anchor=W, pady=8, fill=X)
        ttk.Radiobutton(
            f2, 
            text="Max Compression (Slow)", 
            variable=self.mode, 
            value=4, 
            bootstyle="primary-toolbutton"
        ).pack(anchor=W, pady=8, fill=X)
        
        ttk.Button(self, text="Optimize Now", command=self.run, bootstyle="success", width=20).pack(pady=25)
    
    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p and validate_pdf(p):
            self.path = p
            self.lbl.config(text=os.path.basename(p))
        else:
            messagebox.showerror("Error", "Invalid PDF file")

    def run(self):
        if not self.path:
            messagebox.showwarning("Warning", "Please select a PDF")
            return
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        lvl = self.mode.get()
        path_copy = self.path
        
        def job():
            try:
                doc = fitz.open(path_copy)
                doc.save(out, garbage=lvl, deflate=True)
                doc.close()
                self.app.progress_queue.put(("done", "Optimization Complete"))
                logger.info(f"Compression completed: {out}")
            except Exception as e:
                logger.error(f"Compression error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class SplitPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.path = None
        
        ttk.Label(
            self, 
            text="Split / Extract Pages", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 20))
        
        f = ttk.Frame(self)
        f.pack(fill=X, pady=10)
        ttk.Button(f, text="Select PDF", command=self.pick, bootstyle="primary").pack(side=LEFT)
        self.lbl = ttk.Label(f, text="None", font=("Segoe UI", 10, "italic"))
        self.lbl.pack(side=LEFT, padx=15)
        
        ttk.Label(self, text="Ranges (e.g., 1-5, 8, 10-12):", font=("Segoe UI", 10)).pack(anchor=W, pady=(10, 5))
        self.ent = ttk.Entry(self)
        self.ent.pack(fill=X, pady=5)
        
        ttk.Button(self, text="Extract Pages", command=self.run, bootstyle="success", width=20).pack(pady=25)

    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p and validate_pdf(p):
            self.path = p
            self.lbl.config(text=os.path.basename(p))
        else:
            messagebox.showerror("Error", "Invalid PDF file")

    def run(self):
        if not self.path:
            messagebox.showwarning("Warning", "Please select a PDF")
            return
        
        rng = self.ent.get()
        d = filedialog.askdirectory()
        
        if not rng or not d:
            return
        
        path_copy = self.path
        
        def job():
            try:
                r = PdfReader(path_copy)
                parsed = parse_ranges(rng, len(r.pages))
                
                if not parsed:
                    raise ValueError("Invalid page ranges")
                
                for s, e in parsed:
                    w = PdfWriter()
                    for i in range(s - 1, e):
                        w.add_page(r.pages[i])
                    
                    out_path = os.path.join(d, f"split_pg_{s}-{e}.pdf")
                    with open(out_path, "wb") as f:
                        w.write(f)
                
                self.app.progress_queue.put(("done", "Split Complete"))
                logger.info(f"Split completed: {d}")
            except Exception as e:
                logger.error(f"Split error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class WatermarkPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.src = None
        self.img = None
        
        ttk.Label(
            self, 
            text="Watermark", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 20))
        
        ttk.Button(self, text="Select PDF", command=self.pick, bootstyle="primary").pack(anchor=W)
        self.lbl = ttk.Label(self, text="None", font=("Segoe UI", 10, "italic"))
        self.lbl.pack(anchor=W, pady=5)
        
        ttk.Label(self, text="Rotation Angle (deg):", font=("Segoe UI", 10)).pack(anchor=W, pady=(10, 5))
        self.angle_ent = ttk.Entry(self)
        self.angle_ent.pack(fill=X, pady=5)
        self.angle_ent.insert(0, "45")

        nb = ttk.Notebook(self)
        nb.pack(fill=X, pady=20)
        
        t_tab = ttk.Frame(nb, padding=20)
        nb.add(t_tab, text="Text")
        i_tab = ttk.Frame(nb, padding=20)
        nb.add(i_tab, text="Image")
        
        ttk.Label(t_tab, text="Text:").pack(anchor=W)
        self.txt = ttk.Entry(t_tab)
        self.txt.pack(fill=X, pady=5)
        self.txt.insert(0, "CONFIDENTIAL")
        
        ttk.Button(i_tab, text="Select Image", command=self.pick_img, bootstyle="primary").pack(anchor=W)
        self.lbl_img = ttk.Label(i_tab, text="None")
        self.lbl_img.pack(anchor=W, pady=5)
        
        ttk.Button(self, text="Apply Watermark", command=self.run, bootstyle="success", width=20).pack(pady=20)

    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p and validate_pdf(p):
            self.src = p
            self.lbl.config(text=os.path.basename(p))
        else:
            messagebox.showerror("Error", "Invalid PDF file")

    def pick_img(self):
        p = filedialog.askopenfilename(filetypes=[("Images", "*.png;*.jpg")])
        if p and validate_file_exists(p):
            self.img = p
            self.lbl_img.config(text=os.path.basename(p))

    def run(self):
        if not self.src:
            messagebox.showwarning("Warning", "Please select a PDF")
            return
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        t_val = self.txt.get()
        try:
            angle = float(self.angle_ent.get())
        except ValueError:
            angle = 0.0
        
        src_copy = self.src
        img_copy = self.img
        
        def job():
            try:
                r = PdfReader(src_copy)
                w = PdfWriter()
                bio = io.BytesIO()
                c = canvas.Canvas(bio, pagesize=Config.WATERMARK_PAGESIZE)
                
                if img_copy:
                    c.saveState()
                    c.translate(300, 400)
                    c.rotate(angle)
                    c.drawImage(img_copy, -200, -200, 400, 400, mask='auto')
                    c.restoreState()
                else:
                    c.translate(300, 400)
                    c.rotate(angle)
                    c.setFont("Helvetica-Bold", 50)
                    c.setFillColor(colors.Color(0, 0, 0, Config.WATERMARK_OPACITY))
                    c.drawCentredString(0, 0, t_val)
                
                c.save()
                bio.seek(0)
                wm = PdfReader(bio).pages[0]
                
                for p in r.pages:
                    p.merge_page(wm)
                    w.add_page(p)
                
                with open(out, "wb") as f:
                    w.write(f)
                
                self.app.progress_queue.put(("done", "Watermark Applied"))
                logger.info(f"Watermark applied: {out}")
            except Exception as e:
                logger.error(f"Watermark error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class ProtectPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.path = None
        
        ttk.Label(
            self, 
            text="Security", 
            font=("Segoe UI", 18, "bold")
        ).pack(anchor=W, pady=(0, 20))
        
        ttk.Button(self, text="Select PDF", command=self.pick, bootstyle="primary").pack(anchor=W)
        self.lbl = ttk.Label(self, text="None", font=("Segoe UI", 10, "italic"))
        self.lbl.pack(anchor=W, pady=5)
        
        ttk.Label(self, text="Password:", font=("Segoe UI", 10)).pack(anchor=W, pady=(15, 5))
        self.pw = ttk.Entry(self, show="*")
        self.pw.pack(fill=X, pady=5)
        
        b = ttk.Frame(self)
        b.pack(fill=X, pady=25)
        ttk.Button(b, text="Encrypt", command=self.lock, bootstyle="success", width=15).pack(side=LEFT, padx=5)
        ttk.Button(b, text="Decrypt", command=self.unlock, bootstyle="success", width=15).pack(side=LEFT, padx=5)

    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p and validate_pdf(p):
            self.path = p
            self.lbl.config(text=os.path.basename(p))
        else:
            messagebox.showerror("Error", "Invalid PDF file")

    def lock(self):
        if not self.path:
            messagebox.showwarning("Warning", "Please select a PDF")
            return
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        pw = self.pw.get()
        if not pw:
            messagebox.showwarning("Warning", "Please enter a password")
            return
        
        path_copy = self.path
        
        def job():
            try:
                r = PdfReader(path_copy)
                w = PdfWriter()
                w.append_pages_from_reader(r)
                w.encrypt(pw)
                
                with open(out, "wb") as f:
                    w.write(f)
                
                self.app.progress_queue.put(("done", "Encrypted"))
                logger.info(f"PDF encrypted: {out}")
            except Exception as e:
                logger.error(f"Encryption error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

    def unlock(self):
        if not self.path:
            messagebox.showwarning("Warning", "Please select a PDF")
            return
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")]
        )
        if not out:
            return
        
        pw = self.pw.get()
        path_copy = self.path
        
        def job():
            try:
                r = PdfReader(path_copy)
                if r.is_encrypted:
                    if not r.decrypt(pw):
                        raise ValueError("Incorrect password")
                
                w = PdfWriter()
                w.append_pages_from_reader(r)
                
                with open(out, "wb") as f:
                    w.write(f)
                
                self.app.progress_queue.put(("done", "Decrypted"))
                logger.info(f"PDF decrypted: {out}")
            except Exception as e:
                logger.error(f"Decryption error: {e}")
                self.app.progress_queue.put(("error", str(e)))
        
        self.app.run_worker(job)

class AboutPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        
        card = ttk.Frame(self, bootstyle="light", padding=30)
        card.place(relx=0.5, rely=0.5, anchor="center", relwidth=0.7)
        
        ttk.Label(card, text="📄", font=("Segoe UI", 48)).pack()
        
        ttk.Label(
            card, 
            text="PDF Toolkit", 
            font=("Segoe UI", 28, "bold"), 
            bootstyle="primary"
        ).pack(pady=(5, 5))
        
        ttk.Label(card, text="Version 7.0 Pro", font=("Segoe UI", 12), foreground="grey").pack()
        
        ttk.Separator(card, orient="horizontal").pack(fill=X, pady=20)
        
        info_frame = ttk.Frame(card)
        info_frame.pack(pady=5)
        
        ttk.Label(info_frame, text="Developer:", font=("Segoe UI", 11, "bold")).grid(row=0, column=0, sticky="e", padx=10)
        ttk.Label(info_frame, text="Ashutosh Singh", font=("Segoe UI", 11)).grid(row=0, column=1, sticky="w")
        
        ttk.Label(info_frame, text="Contact:", font=("Segoe UI", 11, "bold")).grid(row=1, column=0, sticky="e", padx=10, pady=5)
        ttk.Label(info_frame, text="kshatriya205902@gmail.com", font=("Segoe UI", 11), foreground="#2780E3").grid(row=1, column=1, sticky="w", pady=5)
        
        btn = ttk.Button(
            card, 
            text="Visit Portfolio", 
            command=lambda: webbrowser.open("https://irealashu.in"), 
            bootstyle="primary", 
            width=25
        )
        btn.pack(pady=30)

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("PDF Toolkit v7.0 Starting")
    logger.info("=" * 60)
    try:
        app = MainApp()
        app.mainloop()
    except Exception as e:
        logger.critical(f"Critical error: {e}\n{traceback.format_exc()}")
        messagebox.showerror("Critical Error", f"Application crashed: {str(e)}")
    finally:
        logger.info("Application closed")
