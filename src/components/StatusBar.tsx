import React from 'react';

interface StatusBarProps {
  status: string;
  progress: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, progress }) => {
  return (
    <footer className="bg-[#f8f9fa] border-t border-[#e9ecef] px-5 py-2 flex items-center justify-between text-xs text-slate-700 shrink-0 select-none">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span className="font-medium text-slate-800">{status || 'Ready | v8.0 Pro'}</span>
      </div>

      <div className="flex items-center gap-3">
        {progress > 0 && progress < 100 && (
          <span className="text-[11px] font-mono text-slate-500">{progress}%</span>
        )}
        <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              progress > 0
                ? 'bg-[#28a745] bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-transparent'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </footer>
  );
};
