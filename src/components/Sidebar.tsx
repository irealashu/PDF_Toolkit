import React from 'react';
import {
  LayoutGrid,
  Combine,
  Image as ImageIcon,
  Scissors,
  Stamp,
  Minimize2,
  Lock,
  Info,
  FileCode,
  User,
  Hash,
  Grid,
  Crop,
  Images,
  SunMedium,
  EyeOff,
  Layers,
  GitCompare,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavSection } from '../types';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Document Pages',
    items: [
      { id: 'organize', label: 'Organize Pages', icon: LayoutGrid },
      { id: 'merge', label: 'Merge PDFs', icon: Combine },
      { id: 'split', label: 'Split / Extract', icon: Scissors },
      { id: 'nup', label: 'N-Up Handouts', icon: Grid },
      { id: 'crop', label: 'Crop Margins', icon: Crop },
      { id: 'pagenumber', label: 'Page Numbers', icon: Hash },
    ],
  },
  {
    label: 'Convert & Export',
    items: [
      { id: 'img2pdf', label: 'Image to PDF', icon: ImageIcon },
      { id: 'pdf2img', label: 'PDF to Images', icon: Images },
      { id: 'grayscale', label: 'Grayscale B&W', icon: SunMedium },
      { id: 'extract', label: 'Text Extract', icon: FileCode },
    ],
  },
  {
    label: 'Edit & Protect',
    items: [
      { id: 'redact', label: 'Redact Area', icon: EyeOff },
      { id: 'flatten', label: 'Flatten Forms', icon: Layers },
      { id: 'watermark', label: 'Watermark', icon: Stamp },
      { id: 'protect', label: 'Security & Encrypt', icon: Lock },
      { id: 'compress', label: 'Compress PDF', icon: Minimize2 },
    ],
  },
  {
    label: 'Inspect & Compare',
    items: [
      { id: 'compare', label: 'PDF Compare', icon: GitCompare },
      { id: 'bookmarks', label: 'Bookmarks & TOC', icon: Bookmark },
      { id: 'info', label: 'PDF Info & Meta', icon: Info },
      { id: 'about', label: 'About', icon: User },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`bg-[#f8f9fa] border-r border-[#e9ecef] flex flex-col shrink-0 h-full transition-[width] duration-200 ease-in-out select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Collapsible trigger */}
      <div className="p-3 border-b border-[#e9ecef]/80 flex items-center justify-between min-h-[46px]">
        {!isCollapsed && (
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#2780e3] truncate">
            Toolkit Modules
          </h2>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
          className={`p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer ${
            isCollapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="p-2 flex-1 overflow-y-auto overflow-x-hidden space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {group.label}
              </div>
            ) : (
              <div className="border-t border-slate-200 my-2 mx-1" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded text-xs font-medium transition-all text-left cursor-pointer ${
                      isCollapsed
                        ? 'justify-center p-2.5'
                        : 'gap-2.5 px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[#2780e3] text-white shadow-xs font-semibold'
                        : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Footer note */}
      <div className="p-2 border-t border-[#e9ecef] text-[10px] text-slate-400 text-center truncate">
        {isCollapsed ? <span>v1.0</span> : <span>PDF Toolkit v1.0 Pro</span>}
      </div>
    </aside>
  );
};

