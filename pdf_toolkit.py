#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Toolkit v2 - Core Functions (Final Enhanced Version)
Features:
- Merge (auto-naming based on input files)
- Split/Extract (multiple output files based on ranges, auto-naming)
- Watermark (text & image, supports batch)
- Password: add / remove owner/user passwords
- Page numbering/stamp
- Organize (Visual): View thumbnails, rotate, remove, add pages, drag & drop reorder.
- About Page
Dependencies: pypdf, pillow, reportlab, pymupdf.
"""

import os
import sys
import io
import threading
import queue
import math
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser
import webbrowser

# --- dependency guard ---
def _startup_guard():
    try:
        root = tk.Tk()
        root.withdraw()
    except Exception:
        sys.exit(1)

    missing = []
    try:
        import pypdf  # noqa: F401
    except Exception:
        missing.append("pypdf")
    try:
        from PIL import Image, ImageTk  # noqa: F401
    except Exception:
        missing.append("pillow")
    try:
        import reportlab  # noqa: F401
    except Exception:
        missing.append("reportlab")
    try:
        import fitz  # noqa: F401 (pymupdf)
    except Exception:
        missing.append("pymupdf")

    if missing:
        messagebox.showerror(
            "Missing dependencies",
            "Please install required packages:\n\n    pip install " + " ".join(missing)
        )
        root.destroy()
        sys.exit(1)
    
    # dependencies okay, destroy guard root
    root.destroy()

_startup_guard()

# Imports (after guard)
import fitz  # pymupdf
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from PIL import Image, ImageOps, ImageTk

APP_TITLE = "PDF Toolkit v2 — Core (Enhanced)"

# Utility helpers
def safe_make_dirs(path: str):
    folder = os.path.dirname(os.path.abspath(path))
    if folder and not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)

def hex_to_rgb_fraction(hexcolor: str):
    hexcolor = hexcolor.lstrip("#")
    if len(hexcolor) == 6:
        r = int(hexcolor[0:2], 16) / 255.0
        g = int(hexcolor[2:4], 16) / 255.0
        b = int(hexcolor[4:6], 16) / 255.0
        return r, g, b
    return 0, 0, 0

# parse ranges helper
def parse_ranges(ranges_text: str, total_pages: int):
    text = ranges_text.strip()
    if not text:
        return []
    
    parts = [p.strip() for p in text.replace(" ", "").split(",") if p.strip()]
    result = []
    
    for part in parts:
        if "-" in part:
            left, right = part.split("-", 1)
            if left == "" and right == "": raise ValueError(f"Range '-' is not valid: {part}")
            
            try:
                start = int(left) if left else 1
                end = int(right) if right else total_pages
            except ValueError:
                 raise ValueError(f"Invalid characters in range: {part}")
        else:
            try:
                start = end = int(part)
            except ValueError:
                 raise ValueError(f"Invalid characters in page number: {part}")

        start = max(1, min(total_pages, start))
        end = max(1, min(total_pages, end))
        
        if start > end:
             raise ValueError(f"Start page {start} cannot be after end page {end} in range: {part}")
             
        result.append((start, end))
        
    return result

# Thread-safe progress updater
class WorkerThread(threading.Thread):
    def __init__(self, target, args=(), kwargs=None, progress_queue=None):
        super().__init__(daemon=True)
        self._target = target
        self._args = args
        self._kwargs = kwargs or {}
        self.progress_queue = progress_queue

    def run(self):
        try:
            self._target(*self._args, **self._kwargs)
            # The target function is now responsible for sending the final "done" signal
        except Exception as e:
            if self.progress_queue:
                self.progress_queue.put(("error", str(e)))
            else:
                raise

# ---------------- UI ----------------
class LeftMenu(tk.Frame):
    def __init__(self, master, commands):
        super().__init__(master, width=180, padx=8, pady=8)
        self.pack_propagate(False)
        self.commands = commands
        # Use ttk Label and custom style for the app title
        ttk.Label(self, text="PDF Toolkit", style='Header.TLabel').pack(pady=(2,8))
        for label, cmd in commands:
            b = ttk.Button(self, text=label, command=cmd)
            b.pack(fill=tk.X, pady=4)

class MainApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1100x700")
        self.minsize(900, 600)

        # --- UI Enhancement: Theming & Styling ---
        style = ttk.Style(self)
        try:
            style.theme_use('clam') 
        except:
            pass # Fallback to default if clam not available
        
        style.configure('TLabel', font=('Helvetica', 10))
        style.configure('TButton', font=('Helvetica', 10), padding=5)
        
        style.configure('Header.TLabel', 
                        font=('Helvetica', 14, 'bold'), 
                        foreground='#004D99',
                        padding=5)
        
        style.configure('Primary.TButton', 
                        background='#4CAF50', 
                        foreground='white',
                        font=('Helvetica', 10, 'bold'))
        style.map('Primary.TButton', 
                 foreground=[('pressed', 'white'), ('active', 'white')],
                 background=[('pressed', '!disabled', '#388E3C'), ('active', '#66BB6A')])
        # -----------------------------------------

        # Status & progress
        self.status = tk.StringVar(value="Ready")
        self.progress_var = tk.DoubleVar(value=0.0)
        self.progress_queue = queue.Queue()

        # Main layout: left menu + right content
        container = tk.Frame(self)
        container.pack(fill=tk.BOTH, expand=True)

        # content frames dict
        self.frames = {}

        # define left menu commands and pages
        menu_items = [
            ("Organize (Visual)", self.show_organize),
            ("Merge", self.show_merge),
            ("Split / Extract", self.show_split),
            ("Watermark", self.show_watermark),
            ("Protect / Password", self.show_protect),
            ("About", self.show_about),
        ]

        left = LeftMenu(container, menu_items)
        left.pack(side=tk.LEFT, fill=tk.Y)

        # right frame
        self.right = tk.Frame(container, padx=10, pady=10)
        self.right.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # create pages
        self.frames['organize'] = OrganizePage(self.right, self)
        self.frames['merge'] = MergePage(self.right, self)
        self.frames['split'] = SplitPage(self.right, self)
        self.frames['watermark'] = WatermarkPage(self.right, self)
        self.frames['protect'] = ProtectPage(self.right, self)
        self.frames['about'] = AboutPage(self.right, self)

        for f in self.frames.values():
            f.place(in_=self.right, x=0, y=0, relwidth=1, relheight=1)

        # bottom status bar
        sb = tk.Frame(self, relief=tk.RIDGE, bd=1)
        sb.pack(side=tk.BOTTOM, fill=tk.X)
        tk.Label(sb, textvariable=self.status, anchor="w").pack(side=tk.LEFT, padx=6)
        ttk.Progressbar(sb, variable=self.progress_var, maximum=100).pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=6, pady=4)

        # start with organize
        self.show_organize()
        # start progress queue poll
        self.after(200, self._poll_progress)

    def _poll_progress(self):
        try:
            while True:
                typ, payload = self.progress_queue.get_nowait()
                if typ == "progress":
                    self.progress_var.set(payload)
                elif typ == "status":
                    self.status.set(payload)
                elif typ == "done":
                    # --- NEW: Announce completion and display message ---
                    self.status.set("Done")
                    self.progress_var.set(0)
                    final_msg = payload if payload else "Operation completed successfully!"
                    messagebox.showinfo("Success 🎉", final_msg)
                    # ----------------------------------------------------
                elif typ == "error":
                    messagebox.showerror("Error", payload)
                    self.status.set("Error")
                    self.progress_var.set(0)
        except queue.Empty:
            pass
        self.after(200, self._poll_progress)

    def run_worker(self, fn, *args, **kwargs):
        self.status.set("Working...")
        self.progress_var.set(0)
        t = WorkerThread(fn, args=args, kwargs=kwargs, progress_queue=self.progress_queue)
        t.start()

    # page switch methods
    def show_organize(self):
        self._show('organize')
    def show_merge(self):
        self._show('merge')
    def show_split(self):
        self._show('split')
    def show_watermark(self):
        self._show('watermark')
    def show_protect(self):
        self._show('protect')
    def show_about(self):
        self._show('about')

    def _show(self, key):
        for k, f in self.frames.items():
            if k == key:
                f.lift()
            else:
                f.lower()

# ---------------- Helper for Scrollable Frame ----------------
class ScrollableFrame(tk.Frame):
    def __init__(self, container, *args, **kwargs):
        super().__init__(container, *args, **kwargs)
        canvas = tk.Canvas(self)
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        self.scrollable_frame = tk.Frame(canvas)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.canvas = canvas

# ---------------- Pages ----------------
class OrganizePage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.page_widgets = [] # List of PageCard objects
        self.thumb_size = (150, 200)
        self.selected_card = None

        # Header
        ttk.Label(self, text="Organize Pages (Visual View)", style='Header.TLabel').pack(anchor="w")
        ttk.Label(self, text="Drag & Drop to reorder. Click a thumbnail to Add/Insert pages.", font=("Helvetica", 9, "italic"), foreground="gray").pack(anchor="w", padx=2)

        # Top Control
        top = tk.Frame(self)
        top.pack(fill=tk.X, pady=6)
        ttk.Button(top, text="📂 Open/Clear PDF...", command=self.load_pdf_clear).pack(side=tk.LEFT)
        ttk.Button(top, text="➕ Add Page(s) to End", command=self.add_pdf_append).pack(side=tk.LEFT, padx=5)
        
        self.lbl_info = ttk.Label(top, text="(no file loaded)")
        self.lbl_info.pack(side=tk.LEFT, padx=10)
        
        ttk.Button(top, text="💾 Save Changes...", command=self.save_pdf, style='Primary.TButton').pack(side=tk.RIGHT, padx=5)

        # Main Scrollable Area
        self.scroll_container = ScrollableFrame(self)
        self.scroll_container.pack(fill=tk.BOTH, expand=True, pady=5)
        self.grid_frame = self.scroll_container.scrollable_frame
        # Click on empty space deselects
        self.grid_frame.bind("<Button-1>", lambda e: self.deselect_all())
        
        # Grid settings
        self.grid_cols = 5

    def deselect_all(self):
        if self.selected_card:
            self.selected_card.deselect()
            self.selected_card = None

    def select_card(self, card):
        if self.selected_card and self.selected_card != card:
            self.selected_card.deselect()
        self.selected_card = card
        self.selected_card.select()

    def insert_pages_here(self, target_card, before=True):
        """Called by PageCard + buttons."""
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if not p: return
        
        idx = self.page_widgets.index(target_card)
        # If before, we insert at idx. If after, insert at idx+1
        insert_idx = idx if before else idx + 1
        
        self.app.run_worker(self._render_worker, p, insert_idx=insert_idx)

    def load_pdf_clear(self):
        """Opens a PDF, clearing existing pages."""
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if not p: return
        self.lbl_info.config(text=os.path.basename(p))
        self.deselect_all()
        
        # Clear old widgets
        for w in self.page_widgets:
            w.destroy()
        self.page_widgets.clear()
        
        # Start worker
        self.app.run_worker(self._render_worker, p)

    def add_pdf_append(self):
        """Appends pages from a new PDF to the list."""
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if not p: return
        
        current_text = self.lbl_info.cget("text")
        if "(no file" in current_text:
            self.lbl_info.config(text=os.path.basename(p))
        else:
            self.lbl_info.config(text=current_text + " + " + os.path.basename(p))
            
        self.app.run_worker(self._render_worker, p)

    def _render_worker(self, path, insert_idx=None):
        try:
            doc = fitz.open(path)
            total = len(doc)
            page_data = []

            for i, page in enumerate(doc):
                # Render page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(0.3, 0.3)) # Scale down for thumbnail
                mode = "RGBA" if pix.alpha else "RGB"
                img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                
                # Keep aspect ratio for thumbnail
                img.thumbnail(self.thumb_size)
                
                page_data.append({
                    "index": i,
                    "image": img,
                    "path": path, # Store source path
                    "rotation": 0
                })
                
                pct = int(((i+1)/total)*50)
                self.app.progress_queue.put(("progress", pct))
                self.app.progress_queue.put(("status", f"Rendering {i+1}/{total} from {os.path.basename(path)}"))

            doc.close()
            
            # Schedule UI update on main thread
            self.after(100, lambda: self._append_to_grid(page_data, insert_idx))
            
        except Exception as e:
            self.app.progress_queue.put(("error", f"Could not render PDF: {e}"))

    def _append_to_grid(self, new_page_data, insert_idx=None):
        self.app.progress_queue.put(("status", "Populating grid..."))
        
        new_cards = []
        for data in new_page_data:
            card = PageCard(self.grid_frame, data["index"], data["image"], data["path"], self)
            new_cards.append(card)
        
        if insert_idx is not None:
            # Insert specific position
            for i, card in enumerate(new_cards):
                self.page_widgets.insert(insert_idx + i, card)
        else:
            # Append to end
            self.page_widgets.extend(new_cards)
        
        self._reflow_grid()
                
        self.app.progress_queue.put(("status", "Loaded."))
        self.app.progress_queue.put(("progress", 0))

    def remove_page_card(self, card):
        if card == self.selected_card:
            self.selected_card = None
        card.destroy()
        if card in self.page_widgets:
            self.page_widgets.remove(card)
        self._reflow_grid()

    def _reflow_grid(self):
        for w in self.grid_frame.winfo_children():
            w.grid_forget()
            
        row = 0
        col = 0
        for card in self.page_widgets:
            card.grid(row=row, column=col, padx=5, pady=5)
            col += 1
            if col >= self.grid_cols:
                col = 0
                row += 1

    # --- Drag and Drop Logic ---
    def on_drag_start(self, card, event):
        self.select_card(card) # Select on drag start
        self.drag_item = card
        card.lift()

    def on_drag_motion(self, card, event):
        if not hasattr(self, 'drag_item') or not self.drag_item:
            return
            
        x, y = self.grid_frame.winfo_pointerx() - self.grid_frame.winfo_rootx(), \
               self.grid_frame.winfo_pointery() - self.grid_frame.winfo_rooty()
        
        if not self.page_widgets: return
        
        w_width = self.page_widgets[0].winfo_width() + 10 
        w_height = self.page_widgets[0].winfo_height() + 10
        if w_width < 50: w_width = 170 
        if w_height < 50: w_height = 250
        
        target_col = max(0, min(self.grid_cols - 1, x // w_width))
        target_row = max(0, y // w_height)
        
        target_idx = target_row * self.grid_cols + target_col
        
        if target_idx >= len(self.page_widgets):
            target_idx = len(self.page_widgets) - 1
            
        current_idx = self.page_widgets.index(self.drag_item)
        
        if target_idx != current_idx:
            self.page_widgets.pop(current_idx)
            self.page_widgets.insert(target_idx, self.drag_item)
            self._reflow_grid()

    def on_drag_stop(self, card, event):
        self.drag_item = None
    # ---------------------------

    def save_pdf(self):
        if not self.page_widgets:
            return

        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile="organized.pdf")
        if not out: return

        def job():
            try:
                # Cache readers: path -> PdfReader
                readers = {}
                writer = PdfWriter()
                
                total = len(self.page_widgets)
                
                for i, card in enumerate(self.page_widgets):
                    src = card.source_path
                    if src not in readers:
                        readers[src] = PdfReader(src)
                    
                    reader = readers[src]
                    # Ensure index is valid
                    if card.orig_index < len(reader.pages):
                        page = reader.pages[card.orig_index]
                        
                        rot = card.rotation % 360
                        if rot != 0:
                            page.rotate(rot)
                        
                        writer.add_page(page)
                    
                    self.app.progress_queue.put(("progress", int(((i+1)/total)*100)))
                    self.app.progress_queue.put(("status", f"Saving page {i+1}/{total}"))
                    
                with open(out, "wb") as f:
                    writer.write(f)
                    
                final_msg = f"Saved organized PDF to: {out}"
                self.app.progress_queue.put(("status", final_msg))
                self.app.progress_queue.put(("done", final_msg))
            except Exception as e:
                self.app.progress_queue.put(("error", str(e)))

        self.app.run_worker(job)


class PageCard(tk.Frame):
    def __init__(self, parent, orig_index, pil_image, source_path, manager):
        super().__init__(parent, relief=tk.RIDGE, borderwidth=2, bg="#f0f0f0")
        self.orig_index = orig_index
        self.source_path = source_path
        self.pil_image_original = pil_image 
        self.manager = manager
        self.rotation = 0 
        
        # --- Add Buttons Overlay (Hidden by default) ---
        # We will use place() to show them over the content when selected
        self.btn_add_left = tk.Button(self, text="➕", bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), cursor="hand2",
                                      command=lambda: self.manager.insert_pages_here(self, before=True))
        self.btn_add_right = tk.Button(self, text="➕", bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), cursor="hand2",
                                       command=lambda: self.manager.insert_pages_here(self, before=False))
        
        # Thumbnail Container
        self.thumb_lbl = tk.Label(self, bg="#cccccc", cursor="hand2")
        self.thumb_lbl.pack(padx=5, pady=5)
        self._update_image()
        
        # Bind Drag/Click Events
        self.thumb_lbl.bind("<Button-1>", self.on_press)
        self.thumb_lbl.bind("<B1-Motion>", self.on_drag)
        self.thumb_lbl.bind("<ButtonRelease-1>", self.on_release)
        # Also bind frame click
        self.bind("<Button-1>", self.on_press)
        
        # Info
        fname = os.path.basename(source_path)
        if len(fname) > 15: fname = fname[:12] + "..."
        tk.Label(self, text=f"{fname}\nPg {orig_index+1}", bg="#f0f0f0", font=("Arial", 8)).pack()
        
        # Controls Container
        ctrl = tk.Frame(self, bg="#f0f0f0")
        ctrl.pack(pady=2, fill=tk.X)
        
        btn_view = ttk.Button(ctrl, text="🔍", width=3, command=self.view_large)
        btn_view.pack(side=tk.LEFT, padx=2)
        
        btn_rot = ttk.Button(ctrl, text="↻", width=3, command=self.rotate_cw)
        btn_rot.pack(side=tk.LEFT, padx=2)
        
        btn_del = ttk.Button(ctrl, text="🗑", width=3, command=self.delete_me)
        btn_del.pack(side=tk.LEFT, padx=2)

    def select(self):
        self.config(bg="#90CAF9", relief=tk.SOLID) # Highlight blue
        # Show buttons using place to overlay on left/right edges
        self.btn_add_left.place(relx=0.0, rely=0.5, anchor="w", width=25, height=40)
        self.btn_add_right.place(relx=1.0, rely=0.5, anchor="e", width=25, height=40)

    def deselect(self):
        self.config(bg="#f0f0f0", relief=tk.RIDGE) # Reset
        self.btn_add_left.place_forget()
        self.btn_add_right.place_forget()

    def on_press(self, event):
        self.manager.on_drag_start(self, event)
    def on_drag(self, event):
        self.manager.on_drag_motion(self, event)
    def on_release(self, event):
        self.manager.on_drag_stop(self, event)
        
    def _update_image(self):
        rotated = self.pil_image_original.rotate(-self.rotation, expand=True)
        rotated.thumbnail((150, 150))
        self.tk_img = ImageTk.PhotoImage(rotated)
        self.thumb_lbl.config(image=self.tk_img)
        
    def rotate_cw(self):
        self.rotation += 90
        self._update_image()
        
    def delete_me(self):
        self.manager.remove_page_card(self)
        
    def view_large(self):
        top = tk.Toplevel(self)
        top.title(f"Page {self.orig_index+1} Preview")
        try:
            doc = fitz.open(self.source_path)
            page = doc[self.orig_index]
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            mode = "RGBA" if pix.alpha else "RGB"
            img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
            if self.rotation != 0:
                img = img.rotate(-self.rotation, expand=True)
            tk_large = ImageTk.PhotoImage(img)
            lbl = tk.Label(top, image=tk_large)
            lbl.image = tk_large
            lbl.pack()
            doc.close()
        except Exception as e:
            messagebox.showerror("Preview Error", str(e))


class MergePage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.pdfs = []
        # Enhanced header
        header = ttk.Label(self, text="Merge PDFs", style='Header.TLabel')
        header.pack(anchor="w")
        
        frame = tk.Frame(self)
        frame.pack(fill=tk.BOTH, expand=True, pady=8)

        left = tk.Frame(frame)
        left.pack(side=tk.LEFT, fill=tk.Y)
        self.lst = tk.Listbox(left, width=40, selectmode=tk.EXTENDED)
        self.lst.pack(fill=tk.BOTH, expand=True)
        
        # Enhanced control layout for MergePage
        ctrl = tk.Frame(left); ctrl.pack(pady=6)
        ttk.Button(ctrl, text="➕ Add PDFs...", command=self.add_pdfs).pack(fill=tk.X, padx=3, pady=2)
        ttk.Button(ctrl, text="❌ Remove Selected", command=self.remove_selected).pack(fill=tk.X, padx=3, pady=2)
        
        ctrl_move = tk.Frame(left); ctrl_move.pack(pady=4)
        ttk.Button(ctrl_move, text="↑ Up", command=self.move_up).pack(side=tk.LEFT, padx=3)
        ttk.Button(ctrl_move, text="↓ Down", command=self.move_down).pack(side=tk.LEFT, padx=3)
        # -----------------------------------------

        right = tk.Frame(frame)
        right.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=12)
        ttk.Label(right, text="Output filename:").pack(anchor="w")
        self.out_entry = tk.Entry(right)
        self.out_entry.pack(fill=tk.X, pady=4)
        # Primary action button
        ttk.Button(right, text="🚀 Merge & Save...", command=self.merge_and_save, style='Primary.TButton').pack(pady=6, anchor="e")

    def add_pdfs(self):
        paths = filedialog.askopenfilenames(filetypes=[("PDF", "*.pdf")])
        for p in paths:
            if p not in self.pdfs:
                self.pdfs.append(p)
                self.lst.insert(tk.END, os.path.basename(p))
        
        # Optionally pre-fill output entry with the generated name
        if paths:
            self.out_entry.delete(0, tk.END)
            self.out_entry.insert(0, self._generate_default_filename())

    def remove_selected(self):
        idxs = list(map(int, self.lst.curselection()))
        for i in reversed(idxs):
            del self.pdfs[i]
            self.lst.delete(i)
        
        # Update output name after removal
        if self.out_entry.get():
             self.out_entry.delete(0, tk.END)
             self.out_entry.insert(0, self._generate_default_filename())

    def move_up(self):
        idxs = list(map(int, self.lst.curselection()))
        if not idxs: return
        for i in idxs:
            if i == 0: continue
            self.pdfs[i-1], self.pdfs[i] = self.pdfs[i], self.pdfs[i-1]
            txt = self.lst.get(i)
            self.lst.delete(i)
            self.lst.insert(i-1, txt)
            self.lst.selection_set(i-1)
        # Update output name after reordering
        if self.out_entry.get():
             self.out_entry.delete(0, tk.END)
             self.out_entry.insert(0, self._generate_default_filename())

    def move_down(self):
        idxs = list(map(int, self.lst.curselection()))
        if not idxs: return
        for i in reversed(idxs):
            if i == len(self.pdfs)-1: continue
            self.pdfs[i+1], self.pdfs[i] = self.pdfs[i], self.pdfs[i+1]
            txt = self.lst.get(i)
            self.lst.delete(i)
            self.lst.insert(i+1, txt)
            self.lst.selection_set(i+1)
        # Update output name after reordering
        if self.out_entry.get():
             self.out_entry.delete(0, tk.END)
             self.out_entry.insert(0, self._generate_default_filename())

    def _generate_default_filename(self):
        """Generates a default output filename based on the input PDFs."""
        if not self.pdfs:
            return "merged.pdf"
        
        # Get base names of the first up to 3 files
        base_names = [os.path.splitext(os.path.basename(p))[0] for p in self.pdfs[:3]]
        
        # Join names with '+'
        new_name = "+".join(base_names)
        
        # Add suffix if there are many files
        if len(self.pdfs) > 3:
            new_name += "_et_al"
            
        return f"{new_name}_merged.pdf"

    def merge_and_save(self):
        if not self.pdfs:
            messagebox.showwarning("Warning", "Add at least one PDF.")
            return

        # Use the name generated in the entry box as the initial file name suggestion
        initial_file_suggestion = self.out_entry.get() if self.out_entry.get() else self._generate_default_filename()
        
        out = filedialog.asksaveasfilename(
            defaultextension=".pdf", 
            filetypes=[("PDF", "*.pdf")], 
            initialfile=initial_file_suggestion
        )
        
        if not out: return
        safe_make_dirs(out)
        
        def job():
            w = PdfWriter()
            total = len(self.pdfs)
            for idx, p in enumerate(self.pdfs, start=1):
                try:
                    w.append(p)
                except Exception as e:
                    # fallback read pages
                    r = PdfReader(p)
                    for pg in r.pages:
                        w.add_page(pg)
                pct = int((idx/total)*100)
                self.app.progress_queue.put(("progress", pct))
                self.app.progress_queue.put(("status", f"Merging: {idx}/{total}"))
            with open(out, "wb") as f:
                w.write(f)
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Merge complete! Output saved to: {out}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

class SplitPage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.path = None
        # Enhanced header
        ttk.Label(self, text="Split / Extract", style='Header.TLabel').pack(anchor="w")
        
        p = tk.Frame(self)
        p.pack(fill=tk.X, pady=6)
        ttk.Button(p, text="📁 Pick PDF...", command=self.pick).pack(side=tk.LEFT)
        self.lbl = ttk.Label(p, text="(none)")
        self.lbl.pack(side=tk.LEFT, padx=6)
        
        ttk.Label(self, text="Ranges (e.g. 1-184, 185) for multiple output files:").pack(anchor="w")
        self.ent = tk.Entry(self)
        self.ent.pack(fill=tk.X, pady=4)
        
        bframe = tk.Frame(self)
        bframe.pack(fill=tk.X, pady=6)
        ttk.Button(bframe, text="✂️ Extract Ranges", command=self.extract).pack(side=tk.LEFT, padx=3)
        ttk.Button(bframe, text="📄 Split All Pages", command=self.split_all).pack(side=tk.LEFT, padx=3)

    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p:
            self.path = p
            self.lbl.config(text=os.path.basename(p))

    def extract(self):
        if not self.path:
            messagebox.showwarning("Warning", "Pick a PDF first")
            return
            
        range_text = self.ent.get().strip()
        if not range_text:
            messagebox.showwarning("Warning", "Enter page ranges (e.g., 1-184, 185).")
            return
            
        out_dir = filedialog.askdirectory(title="Select Output Folder for Split Files")
        if not out_dir: return

        # Get individual range strings separated by commas, e.g., ["1-184", "185"]
        individual_range_texts = [t.strip() for t in range_text.split(',') if t.strip()]

        try:
            r = PdfReader(self.path)
            total_pages = len(r.pages)
            base_name = os.path.splitext(os.path.basename(self.path))[0]
            
            save_destinations = []
            
            for range_str in individual_range_texts:
                # 1. Parse the range string into a list of (start, end) tuples
                ranges_to_extract = parse_ranges(range_str, total_pages)
                
                pages_to_write = []
                # 2. Collect all pages for this particular range string
                for start, end in ranges_to_extract:
                    for i in range(start - 1, end):
                        # Add a copy/reference to the page object
                        pages_to_write.append(r.pages[i]) 
                
                if pages_to_write:
                    # 3. Generate the output path with the desired naming convention
                    # Ensure range string is safe for filenames
                    safe_range_str = range_str.replace(' ', '').replace('-', '_') 
                    
                    out_path = os.path.join(out_dir, f"{base_name}_{safe_range_str}.pdf")
                    save_destinations.append((out_path, pages_to_write))

            if not save_destinations:
                messagebox.showwarning("Warning", "No pages matched the provided ranges or the ranges were invalid.")
                return
            
            # 4. Start the worker job with the list of destinations and pages
            def job_multi_split():
                total_files = len(save_destinations)
                for idx, (out_path, pages_list) in enumerate(save_destinations):
                    self.app.progress_queue.put(("progress", int((idx/total_files)*100)))
                    self.app.progress_queue.put(("status", f"Writing split file {idx+1}/{total_files}: {os.path.basename(out_path)}"))
                    
                    w = PdfWriter()
                    for page in pages_list:
                        w.add_page(page) 
                        
                    safe_make_dirs(out_path)
                    with open(out_path, "wb") as f:
                        w.write(f)
                    
                # --- SUCCESS ANNOUNCEMENT ---
                final_message = f"Split complete! {total_files} files saved to {out_dir}."
                self.app.progress_queue.put(("status", final_message))
                self.app.progress_queue.put(("done", final_message))
                # ----------------------------
                
            self.app.run_worker(job_multi_split)
            
        except ValueError as e:
            messagebox.showerror("Invalid Range", str(e))
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {e}")

    def split_all(self):
        if not self.path:
            messagebox.showwarning("Warning", "Pick a PDF first")
            return
        out_dir = filedialog.askdirectory()
        if not out_dir: return
        def job():
            r = PdfReader(self.path)
            base = os.path.splitext(os.path.basename(self.path))[0]
            total = len(r.pages)
            for i, page in enumerate(r.pages, start=1):
                w = PdfWriter()
                w.add_page(page)
                fname = os.path.join(out_dir, f"{base}_page_{i}.pdf")
                with open(fname, "wb") as f:
                    w.write(f)
                self.app.progress_queue.put(("progress", int(i/total*100)))
                self.app.progress_queue.put(("status", f"Writing page {i}/{total}"))
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Split complete! {total} pages saved to {out_dir}."
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

class WatermarkPage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.src = None
        self.wm_image = None
        
        # Enhanced header
        ttk.Label(self, text="Watermark (Text / Image) — supports batch", style='Header.TLabel').pack(anchor="w")
        
        top = tk.Frame(self)
        top.pack(fill=tk.X, pady=6)
        ttk.Button(top, text="📁 Pick PDF/Folder...", command=self.pick_source).pack(side=tk.LEFT)
        self.src_lbl = ttk.Label(top, text="(none)")
        self.src_lbl.pack(side=tk.LEFT, padx=8)
        ttk.Button(top, text="📂 Batch: Pick Folder...", command=self.pick_folder).pack(side=tk.LEFT, padx=6)

        # Notebook for text/image
        nb = ttk.Notebook(self)
        nb.pack(fill=tk.X, pady=8)
        self.tab_text = tk.Frame(nb, padx=8, pady=8)
        self.tab_img = tk.Frame(nb, padx=8, pady=8)
        nb.add(self.tab_text, text="Text Watermark")
        nb.add(self.tab_img, text="Image Watermark")

        # Text controls
        ttk.Label(self.tab_text, text="Text:").grid(row=0, column=0, sticky="e")
        self.txt_entry = tk.Entry(self.tab_text, width=30)
        self.txt_entry.insert(0, "CONFIDENTIAL")
        self.txt_entry.grid(row=0, column=1, sticky="w", padx=6)
        ttk.Label(self.tab_text, text="Angle:").grid(row=1, column=0, sticky="e")
        self.angle_scale = tk.Scale(self.tab_text, from_=0, to=360, orient=tk.HORIZONTAL)
        self.angle_scale.set(45); self.angle_scale.grid(row=1, column=1, sticky="we", padx=6)
        ttk.Label(self.tab_text, text="Opacity (0.0-1.0):").grid(row=2, column=0, sticky="e")
        self.op_scale_txt = tk.Scale(self.tab_text, from_=0.1, to=1.0, resolution=0.1, orient=tk.HORIZONTAL)
        self.op_scale_txt.set(0.5); self.op_scale_txt.grid(row=2, column=1, sticky="we", padx=6)
        ttk.Label(self.tab_text, text="Font Size:").grid(row=3, column=0, sticky="e")
        self.font_scale = tk.Scale(self.tab_text, from_=10, to=200, orient=tk.HORIZONTAL)
        self.font_scale.set(50); self.font_scale.grid(row=3, column=1, sticky="we", padx=6)
        self.text_color = "#000000"
        ttk.Button(self.tab_text, text="🎨 Pick Color", command=self.pick_color).grid(row=4, column=1, sticky="w", pady=6)

        # Image controls
        ttk.Button(self.tab_img, text="🖼️ Select Image...", command=self.pick_wm_image).grid(row=0, column=0, sticky="w")
        self.img_lbl = ttk.Label(self.tab_img, text="(none)")
        self.img_lbl.grid(row=0, column=1, sticky="w", padx=6)
        ttk.Label(self.tab_img, text="Scale (0.1-5.0):").grid(row=1, column=0, sticky="e")
        self.scale_img = tk.Scale(self.tab_img, from_=0.1, to=5.0, resolution=0.1, orient=tk.HORIZONTAL)
        self.scale_img.set(1.0); self.scale_img.grid(row=1, column=1, sticky="we", padx=6)
        ttk.Label(self.tab_img, text="Opacity (0.1-1.0):").grid(row=2, column=0, sticky="e")
        self.op_scale_img = tk.Scale(self.tab_img, from_=0.1, to=1.0, resolution=0.1, orient=tk.HORIZONTAL)
        self.op_scale_img.set(0.5); self.op_scale_img.grid(row=2, column=1, sticky="we", padx=6)

        # overlay options: page range
        ttk.Label(self, text="Page ranges (e.g. 1-3,5) — leave empty for all pages").pack(anchor="w")
        self.range_entry = tk.Entry(self)
        self.range_entry.pack(fill=tk.X, pady=4)

        # Apply controls
        apply_frame = tk.Frame(self)
        apply_frame.pack(fill=tk.X, pady=8)
        ttk.Button(apply_frame, text="Apply to Single PDF", command=self.apply_to_single, style='Primary.TButton').pack(side=tk.LEFT, padx=4)
        ttk.Button(apply_frame, text="Apply to Folder (batch)", command=self.apply_to_folder).pack(side=tk.LEFT, padx=4)
        # page number stamp
        ttk.Button(apply_frame, text="🔢 Add Page Numbers", command=self.add_page_numbers).pack(side=tk.LEFT, padx=6)

    def pick_source(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p:
            self.src = p
            self.src_lbl.config(text=os.path.basename(p))

    def pick_folder(self):
        d = filedialog.askdirectory()
        if d:
            self.src = d
            self.src_lbl.config(text=d)

    def pick_wm_image(self):
        p = filedialog.askopenfilename(filetypes=[("Images", "*.png;*.jpg;*.jpeg;*.webp")])
        if p:
            self.wm_image = p
            self.img_lbl.config(text=os.path.basename(p))

    def pick_color(self):
        c = colorchooser.askcolor(title="Choose Text Color", color=self.text_color)
        if c[1]:
            self.text_color = c[1]

    def _create_watermark_reader(self, page_width, page_height, mode_text=True):
        """
        Return PdfReader of a one-page watermark layer sized page_width x page_height.
        mode_text True -> use text watermark, else use image watermark.
        """
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=(page_width, page_height))
        cx, cy = page_width/2, page_height/2

        if mode_text:
            text = self.txt_entry.get()
            angle = self.angle_scale.get()
            opacity = float(self.op_scale_txt.get())
            fsize = int(self.font_scale.get())
            # hex to rgb
            r, g, b = hex_to_rgb_fraction(self.text_color)
            color = colors.Color(r, g, b, alpha=opacity)
            c.saveState()
            c.translate(cx, cy)
            c.rotate(angle)
            # set fill color with alpha using Color object
            c.setFillColor(color)
            c.setFont("Helvetica-Bold", fsize)
            c.drawCentredString(0, 0, text)
            c.restoreState()
        else:
            if not self.wm_image:
                return None
            try:
                img = ImageReader(self.wm_image)
                iw, ih = img.getSize()
                scale = float(self.scale_img.get())
                opacity = float(self.op_scale_img.get())
                w = iw * scale
                h = ih * scale
                c.saveState()
                # draw image centered
                try:
                    # set alpha where possible
                    c.setFillAlpha(opacity)
                    c.setStrokeAlpha(opacity)
                except Exception:
                    pass
                c.drawImage(img, cx - w/2, cy - h/2, width=w, height=h, mask='auto')
                c.restoreState()
            except Exception as e:
                print("Image watermark error:", e)
                return None

        c.save()
        packet.seek(0)
        return PdfReader(packet)

    def apply_to_single(self):
        if not self.src or not os.path.isfile(self.src):
            messagebox.showwarning("Warning", "Pick a source PDF file first.")
            return
        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile="watermarked.pdf")
        if not out: return

        mode_text = True if self.txt_entry.get().strip() else False
        try:
            r = PdfReader(self.src)
        except Exception as e:
            messagebox.showerror("Error", f"Failed reading source:\n{e}")
            return

        def job():
            w = PdfWriter()
            total = len(r.pages)
            # parse ranges
            rng = None
            try:
                # parse_ranges must handle the comma-separated format if used for single file processing
                parsed_ranges_list = parse_ranges(self.range_entry.get(), total) if self.range_entry.get().strip() else [(1, total)]
            except Exception as e:
                self.app.progress_queue.put(("error", str(e)))
                return

            selected_pages = set()
            # If ranges were comma-separated, we treat it as one large contiguous selection here
            for s, e in parsed_ranges_list:
                for p in range(s-1, e):
                    selected_pages.add(p)

            for idx, page in enumerate(r.pages):
                pw = float(page.mediabox.width)
                ph = float(page.mediabox.height)
                if idx in selected_pages:
                    wm_r = self._create_watermark_reader(pw, ph, mode_text=mode_text)
                    if wm_r:
                        try:
                            wm_page = wm_r.pages[0]
                            page.merge_page(wm_page)
                        except Exception:
                            # fallback - try overlay with transformation
                            page.merge_page(wm_r.pages[0])
                w.add_page(page)
                self.app.progress_queue.put(("progress", int((idx+1)/total*100)))
                self.app.progress_queue.put(("status", f"Processing page {idx+1}/{total}"))
            with open(out, "wb") as f:
                w.write(f)
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Watermark applied successfully! Output saved to: {out}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

    def apply_to_folder(self):
        if not self.src or not os.path.isdir(self.src):
            messagebox.showwarning("Warning", "Pick a folder first (Batch).")
            return
        out_dir = filedialog.askdirectory(title="Select output folder for watermarked files")
        if not out_dir: return

        mode_text = True if self.txt_entry.get().strip() else False

        pdfs = [os.path.join(self.src, f) for f in os.listdir(self.src) if f.lower().endswith(".pdf")]
        if not pdfs:
            messagebox.showinfo("Info", "No PDF files found in folder.")
            return

        def job():
            total_files = len(pdfs)
            for idx, p in enumerate(pdfs, start=1):
                try:
                    r = PdfReader(p)
                    w = PdfWriter()
                    total_pages = len(r.pages)
                    parsed_ranges_list = None
                    try:
                        parsed_ranges_list = parse_ranges(self.range_entry.get(), total_pages) if self.range_entry.get().strip() else [(1, total_pages)]
                    except Exception as e:
                        self.app.progress_queue.put(("error", str(e)))
                        return
                    selected_pages = set()
                    for s, e in parsed_ranges_list:
                        for pg in range(s-1, e):
                            selected_pages.add(pg)
                    for i, page in enumerate(r.pages):
                        pw = float(page.mediabox.width); ph = float(page.mediabox.height)
                        if i in selected_pages:
                            wm_r = self._create_watermark_reader(pw, ph, mode_text=mode_text)
                            if wm_r:
                                try:
                                    page.merge_page(wm_r.pages[0])
                                except Exception:
                                    page.merge_page(wm_r.pages[0])
                        w.add_page(page)
                    outfn = os.path.join(out_dir, os.path.basename(p))
                    with open(outfn, "wb") as f:
                        w.write(f)
                except Exception as e:
                    print("Error watermarking", p, e)
                self.app.progress_queue.put(("progress", int(idx/total_files*100)))
                self.app.progress_queue.put(("status", f"Processed {idx}/{total_files}"))
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Batch watermark complete! {total_files} files saved to: {out_dir}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

    def add_page_numbers(self):
        # simple page numbering at bottom-right
        if not self.src or not os.path.isfile(self.src):
            messagebox.showwarning("Pick PDF", "Pick a single PDF first")
            return
        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile="pagenum.pdf")
        if not out: return
        start = simple_number_dialog(self, title="Start number", prompt="Start page number", default=1)
        if start is None:
            return
        try:
            r = PdfReader(self.src)
        except Exception as e:
            messagebox.showerror("Error", f"Failed reading source:\n{e}")
            return
        def job():
            w = PdfWriter()
            total = len(r.pages)
            for i, page in enumerate(r.pages, start=1):
                pw = float(page.mediabox.width); ph = float(page.mediabox.height)
                # create small overlay with page number
                packet = io.BytesIO()
                c = canvas.Canvas(packet, pagesize=(pw, ph))
                txt = str(start + i - 1)
                # bottom-right
                margin = 20
                c.setFont("Helvetica", 10)
                try:
                    c.setFillColor(colors.Color(0,0,0,alpha=0.6))
                except Exception:
                    pass
                c.drawRightString(pw - margin, margin, txt)
                c.save(); packet.seek(0)
                wm = PdfReader(packet)
                try:
                    page.merge_page(wm.pages[0])
                except Exception:
                    page.merge_page(wm.pages[0])
                w.add_page(page)
                self.app.progress_queue.put(("progress", int(i/total*100)))
                self.app.progress_queue.put(("status", f"Numbering page {i}/{total}"))
            with open(out, "wb") as f:
                w.write(f)
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Page numbering complete! Output saved to: {out}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

class ProtectPage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        # Enhanced header
        ttk.Label(self, text="Password Protect / Remove Password", style='Header.TLabel').pack(anchor="w")
        
        frm = tk.Frame(self)
        frm.pack(fill=tk.X, pady=6)
        ttk.Button(frm, text="📁 Pick PDF...", command=self.pick).pack(side=tk.LEFT)
        self.lbl = ttk.Label(frm, text="(none)")
        self.lbl.pack(side=tk.LEFT, padx=6)
        
        ttk.Label(self, text="User password (open):").pack(anchor="w")
        self.user_ent = tk.Entry(self)
        self.user_ent.pack(fill=tk.X)
        
        ttk.Label(self, text="Owner password (permissions):").pack(anchor="w")
        self.owner_ent = tk.Entry(self)
        self.owner_ent.pack(fill=tk.X)
        
        btns = tk.Frame(self)
        btns.pack(pady=8)
        ttk.Button(btns, text="🔒 Add Passwords", command=self.add_password, style='Primary.TButton').pack(side=tk.LEFT, padx=4)
        ttk.Button(btns, text="🔓 Remove Password (provide owner pw)", command=self.remove_password).pack(side=tk.LEFT, padx=4)

        self.pick_path = None

    def pick(self):
        p = filedialog.askopenfilename(filetypes=[("PDF", "*.pdf")])
        if p:
            self.pick_path = p
            self.lbl.config(text=os.path.basename(p))

    def add_password(self):
        if not self.pick_path:
            messagebox.showwarning("Pick file", "Pick a PDF first")
            return
        userpw = self.user_ent.get()
        ownerpw = self.owner_ent.get()
        if not (userpw or ownerpw):
            messagebox.showwarning("Missing", "Enter at least one password (user or owner).")
            return
        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile="protected.pdf")
        if not out: return
        def job():
            r = PdfReader(self.pick_path)
            w = PdfWriter()
            for p in r.pages:
                w.add_page(p)
            # set encryption
            w.encrypt(userpw if userpw else "", ownerpw if ownerpw else "")
            with open(out, "wb") as f:
                w.write(f)
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Password(s) added successfully! Output saved to: {out}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

    def remove_password(self):
        if not self.pick_path:
            messagebox.showwarning("Pick file", "Pick a PDF first")
            return
        ownerpw = self.owner_ent.get()
        if not ownerpw:
            messagebox.showwarning("Owner password required", "Provide owner password to remove protection.")
            return
        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")], initialfile="unlocked.pdf")
        if not out: return
        def job():
            r = PdfReader(self.pick_path, password=ownerpw)
            w = PdfWriter()
            for p in r.pages:
                w.add_page(p)
            with open(out, "wb") as f:
                w.write(f)
            
            # --- SUCCESS ANNOUNCEMENT ---
            final_message = f"Password removed successfully! Output saved to: {out}"
            self.app.progress_queue.put(("status", final_message))
            self.app.progress_queue.put(("done", final_message))
            # ----------------------------

        self.app.run_worker(job)

class AboutPage(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        
        ttk.Label(self, text="About", style='Header.TLabel').pack(anchor="w")
        
        # Specific content container
        content = tk.Frame(self)
        content.pack(expand=True, fill=tk.BOTH, padx=20, pady=20)
        
        # Centered info frame
        info_frame = tk.Frame(content)
        info_frame.place(relx=0.5, rely=0.4, anchor="center")
        
        # App Title
        ttk.Label(info_frame, text="PDF Toolkit v2", font=("Helvetica", 20, "bold")).pack(pady=10)
        
        # Developer Credit
        ttk.Label(info_frame, text="Developed By:", font=("Helvetica", 12)).pack(pady=(20, 5))
        ttk.Label(info_frame, text="Ashutosh Singh", font=("Helvetica", 16, "bold"), foreground="#004D99").pack(pady=5)
        
        # Email Link
        email = "kshatriya205902@gmail.com"
        lbl_email = tk.Label(info_frame, text=email, font=("Helvetica", 10, "underline"), fg="blue", cursor="hand2")
        lbl_email.pack(pady=2)
        lbl_email.bind("<Button-1>", lambda e: webbrowser.open(f"mailto:{email}"))
        
        # Description
        desc = "A powerful utility to merge, split, watermark,\nrotate, and protect your PDF documents.\n\nBuilt with Python, Tkinter, PyPDF, ReportLab, and PyMuPDF."
        ttk.Label(info_frame, text=desc, justify=tk.CENTER, font=("Helvetica", 10)).pack(pady=20)

        # Feature List
        features = [
            "• Merge PDFs: Combine multiple files with auto-naming.",
            "• Split/Extract: Extract specific pages or split entirely.",
            "• Watermark: Add text or image watermarks (supports batch processing).",
            "• Password Protection: Add or remove user/owner passwords.",
            "• Page Numbering: Stamp page numbers on your documents.",
            "• Visual Organizer: View thumbnails, rotate, reorder (drag & drop), remove, or insert pages."
        ]
        
        feat_frame = tk.Frame(info_frame)
        feat_frame.pack(pady=10, fill=tk.X)
        ttk.Label(feat_frame, text="Features:", font=("Helvetica", 11, "bold")).pack(anchor="w", pady=(0, 5))
        for feat in features:
            ttk.Label(feat_frame, text=feat, font=("Helvetica", 9)).pack(anchor="w")

# ---------------- small dialogs ----------------
def simple_number_dialog(parent, title="Enter number", prompt="Number", default=1):
    dlg = tk.Toplevel(parent)
    dlg.title(title)
    dlg.grab_set()
    ttk.Label(dlg, text=prompt).pack(padx=8, pady=6)
    ent = tk.Entry(dlg); ent.pack(padx=8, pady=6); ent.insert(0, str(default))
    result = {"value": None}
    def ok():
        try:
            result["value"] = int(ent.get())
        except:
            result["value"] = None
        dlg.destroy()
    def cancel():
        result["value"] = None; dlg.destroy()
    btn = tk.Frame(dlg); btn.pack(pady=6)
    ttk.Button(btn, text="OK", command=ok).pack(side=tk.LEFT, padx=6)
    ttk.Button(btn, text="Cancel", command=cancel).pack(side=tk.LEFT, padx=6)
    parent.wait_window(dlg)
    return result["value"]

# ---------------- run app ----------------
def main():
    app = MainApp()
    app.mainloop()

if __name__ == "__main__":
    main()