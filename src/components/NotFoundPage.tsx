import React from 'react';
import { Database, AlertOctagon, ArrowLeft, Home, FileCode, BookOpen } from 'lucide-react';
import { ActiveView } from './Sidebar';

interface NotFoundPageProps {
  onNavigate: (view: ActiveView) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center min-h-[60vh] bg-[#FFFFFF] border border-[#D1D5DB] rounded-lg shadow-xs max-w-2xl mx-auto my-auto select-none">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto mb-4 shadow-xs">
        <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[11px] font-mono text-[#4B5563] font-bold uppercase mb-2">
        Error 404 • Resource Not Found
      </div>

      <h1 className="text-xl sm:text-2xl font-mono font-bold text-[#20242A] tracking-tight">
        Migration Artifact or View Not Found
      </h1>

      <p className="text-xs sm:text-sm text-[#4B5563] max-w-md mx-auto mt-2 leading-relaxed">
        The requested database migration analysis view or CI/CD audit run could not be located in the current workspace catalog.
      </p>

      {/* Action shortcuts */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 font-mono text-xs">
        <button
          onClick={() => onNavigate('overview')}
          className="h-9 px-4 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Workbench</span>
        </button>

        <button
          onClick={() => onNavigate('editor')}
          className="h-9 px-4 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Open SQL Editor</span>
        </button>

        <button
          onClick={() => onNavigate('rules')}
          className="h-9 px-4 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Safety Rules Catalog</span>
        </button>
      </div>

      <div className="mt-8 pt-4 border-t border-[#E5E7EB] text-[11px] font-mono text-[#6B7280]">
        Need assistance? Reach our DBA support at{' '}
        <a href="mailto:support@migratecheck.io" className="text-[#2563EB] hover:underline">
          support@migratecheck.io
        </a>
      </div>
    </div>
  );
};
