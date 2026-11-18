import React from 'react';
import { DatabaseEngine, WorkloadProfile } from '../types/analyzer';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  BookOpen, 
  PlayCircle, 
  FileDown, 
  Database,
  Server,
  Shield
} from 'lucide-react';

interface NavbarProps {
  workload: WorkloadProfile;
  setWorkload: React.Dispatch<React.SetStateAction<WorkloadProfile>>;
  onOpenConfig: () => void;
  onOpenRules: () => void;
  onOpenSimulator: () => void;
  onOpenExport: () => void;
  safetyScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  workload,
  setWorkload,
  onOpenConfig,
  onOpenRules,
  onOpenSimulator,
  onOpenExport,
  safetyScore,
}) => {
  const isSafe = safetyScore >= 80;
  const isMedium = safetyScore >= 60 && safetyScore < 80;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                DBMigrate<span className="text-blue-600">Guard</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                Safety Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Database Migration Concurrency & Lock Analyzer
            </p>
          </div>
        </div>

        {/* Center: Target Engine Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setWorkload(prev => ({ ...prev, targetEngine: 'postgres' }))}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              workload.targetEngine === 'postgres'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="PostgreSQL 14+ Locking Semantics"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>PostgreSQL</span>
          </button>
          <button
            onClick={() => setWorkload(prev => ({ ...prev, targetEngine: 'mysql' }))}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              workload.targetEngine === 'mysql'
                ? 'bg-white text-orange-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="MySQL 8.0 InnoDB Online DDL"
          >
            <Server className="w-3.5 h-3.5 text-orange-600" />
            <span>MySQL 8.0</span>
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={onOpenSimulator}
            className="hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Simulate lock contention under active traffic"
          >
            <PlayCircle className="w-4 h-4 text-indigo-600" />
            <span>Live Simulator</span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Browse Database Locking Rules Catalog"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Rule Catalog</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Export PR Review Report"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>

        </div>

      </div>
    </header>
  );
};
