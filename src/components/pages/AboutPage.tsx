import React from 'react';
import {
  FileText,
  User,
  Mail,
  ExternalLink,
  Github,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-xl w-full text-center">
        <div className="w-16 h-16 bg-blue-50 text-[#2780e3] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xs">
          <FileText className="w-9 h-9" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">PDF Toolkit</h2>
        <p className="text-xs font-semibold text-[#2780e3] mt-1 bg-blue-50 inline-block px-2.5 py-0.5 rounded-full">
          Version 1.0 Pro
        </p>

        <p className="text-xs text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
          Comprehensive PDF manipulation suite running client-side with zero server telemetry.
          Organize, merge, convert, split, watermark, compress, protect, and inspect PDFs directly in your browser.
        </p>

        <div className="border-t border-slate-200 my-6"></div>

        <div className="space-y-3 text-left max-w-sm mx-auto text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-slate-50">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Developer:
            </span>
            <span className="text-slate-900 font-medium">Ashutosh Singh</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-50">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Contact:
            </span>
            <a
              href="mailto:kshatriya205902@gmail.com"
              className="text-[#2780e3] hover:underline font-medium"
            >
              kshatriya205902@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://irealashu.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#2780e3] hover:bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <span>Visit Portfolio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
