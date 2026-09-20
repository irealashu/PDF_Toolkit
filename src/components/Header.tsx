import React from 'react';
import { FileText, ShieldCheck, PanelLeftClose, PanelLeft } from 'lucide-react';
import { NavSection } from '../types';

interface HeaderProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  return (
    <header className="bg-[#2780e3] text-white px-4 sm:px-6 py-3 shadow-md flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? 'Expand Menu (Ctrl + B)' : 'Collapse Menu (Ctrl + B)'}
          aria-label={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer"
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="bg-white/15 p-1.5 rounded-md flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">PDF Toolkit</h1>
            <span className="text-[11px] font-semibold text-blue-100 bg-blue-700/70 px-2 py-0.5 rounded">
              v8.0 Pro
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-green-300" />
          <span>Local In-Browser Processing (Private & Secure)</span>
        </div>

        <button
          onClick={() => onNavigate('about')}
          className="text-xs text-white/90 hover:text-white hover:underline transition-colors px-2 py-1"
        >
          About & Author
        </button>
      </div>
    </header>
  );
};
