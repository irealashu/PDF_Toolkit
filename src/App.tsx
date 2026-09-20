import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { ToastContainer } from './components/Toast';
import { OrganizePage } from './components/pages/OrganizePage';
import { MergePage } from './components/pages/MergePage';
import { ImageToPdfPage } from './components/pages/ImageToPdfPage';
import { SplitPage } from './components/pages/SplitPage';
import { WatermarkPage } from './components/pages/WatermarkPage';
import { CompressPage } from './components/pages/CompressPage';
import { ProtectPage } from './components/pages/ProtectPage';
import { PdfInfoPage } from './components/pages/PdfInfoPage';
import { TextExtractPage } from './components/pages/TextExtractPage';
import { PageNumberPage } from './components/pages/PageNumberPage';
import { NUpPage } from './components/pages/NUpPage';
import { CropPage } from './components/pages/CropPage';
import { PdfToImagePage } from './components/pages/PdfToImagePage';
import { GrayscalePage } from './components/pages/GrayscalePage';
import { RedactPage } from './components/pages/RedactPage';
import { FlattenPage } from './components/pages/FlattenPage';
import { ComparePage } from './components/pages/ComparePage';
import { BookmarksPage } from './components/pages/BookmarksPage';
import { AboutPage } from './components/pages/AboutPage';
import { NavSection, ToastMessage } from './types';

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>('organize');
  const [status, setStatus] = useState<string>('Ready | v8.0 Pro');
  const [progress, setProgress] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pdf_toolkit_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('pdf_toolkit_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle menu
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNotify = (
    title: string,
    message: string,
    type: 'success' | 'danger' | 'info' | 'warning' = 'success'
  ) => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSetStatus = (newStatus: string, newProgress: number = 0) => {
    setStatus(newStatus);
    setProgress(newProgress);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'organize':
        return <OrganizePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'merge':
        return <MergePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'img2pdf':
        return <ImageToPdfPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'split':
        return <SplitPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'watermark':
        return <WatermarkPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'compress':
        return <CompressPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'protect':
        return <ProtectPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'info':
        return <PdfInfoPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'extract':
        return <TextExtractPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'pagenumber':
        return <PageNumberPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'nup':
        return <NUpPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'crop':
        return <CropPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'pdf2img':
        return <PdfToImagePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'grayscale':
        return <GrayscalePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'redact':
        return <RedactPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'flatten':
        return <FlattenPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'compare':
        return <ComparePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'bookmarks':
        return <BookmarksPage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
      case 'about':
        return <AboutPage />;
      default:
        return <OrganizePage onNotify={handleNotify} onSetStatus={handleSetStatus} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f9] text-slate-900 overflow-hidden font-sans">
      <Header
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          currentSection={currentSection}
          onNavigate={setCurrentSection}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        <main className="flex-1 p-4 sm:p-5 overflow-y-auto bg-[#f8f9fa]/50 transition-all">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {renderSection()}
          </div>
        </main>
      </div>

      <StatusBar status={status} progress={progress} />
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};

export default App;
