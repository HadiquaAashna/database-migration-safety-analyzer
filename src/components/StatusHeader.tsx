import React from 'react';
import { AnalysisReport, WorkloadProfile } from '../types/analyzer';
import { FileDown, RefreshCw, CheckCircle2, User, Menu, Database } from 'lucide-react';
import { AuthUser } from './LoginModal';

interface StatusHeaderProps {
  report: AnalysisReport;
  workload: WorkloadProfile;
  migrationId?: string;
  isAnalyzing: boolean;
  onReAnalyze: () => void;
  onExport: () => void;
  onSaveToDb?: () => void;
  isSaved?: boolean;
  user?: AuthUser | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
  onLogoClick?: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  report,
  workload,
  migrationId = '#0421',
  isAnalyzing,
  onReAnalyze,
  onExport,
  onSaveToDb,
  isSaved = false,
  user,
  onOpenLogin,
  onLogout,
  onOpenMobileMenu,
  onLogoClick,
}) => {
  const { safetyScore, overallRisk, issues, metrics } = report;

  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = issues.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = issues.filter((i) => i.severity === 'MEDIUM').length;

  const isAwaitingInput = report.parsedStatements.length === 0;

  // Build the lock risk bar
  const getLockRiskBar = (risk: string) => {
    if (isAwaitingInput) {
      return {
        blocks: '□□□□□□□□□□□',
        label: 'AWAITING DDL',
        color: 'text-[#6B7280]',
      };
    }
    switch (risk) {
      case 'CRITICAL':
        return {
          blocks: '■■■■■■■■■■■',
          label: 'CRITICAL',
          color: 'text-[#DC2626]',
        };
      case 'HIGH':
        return {
          blocks: '■■■■■■■■□□□',
          label: 'HIGH',
          color: 'text-[#DC2626]',
        };
      case 'MEDIUM':
        return {
          blocks: '■■■■■□□□□□□',
          label: 'MEDIUM',
          color: 'text-[#D97706]',
        };
      default:
        return {
          blocks: '■■□□□□□□□□□',
          label: 'SAFE',
          color: 'text-[#15803D]',
        };
    }
  };

  const lockRisk = getLockRiskBar(overallRisk);

  const getRiskColor = (risk: string) => {
    if (isAwaitingInput) {
      return 'text-[#4B5563] bg-[#F3F4F6] border-[#E5E7EB]';
    }
    switch (risk) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]';
      case 'MEDIUM':
        return 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
      default:
        return 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]';
    }
  };

  const formattedDowntime =
    isAwaitingInput
      ? '--'
      : metrics.estimatedDowntimeMaxSeconds === 0
      ? '0s (Zero-Downtime)'
      : `~${metrics.estimatedDowntimeMaxSeconds}s`;

  return (
    <div className="bg-[#FFFFFF] border-b border-[#D1D5DB] px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 z-20">
      
      {/* 1. Mobile Top Row: Hamburger + Title + Fast Actions (Visible on screens < md) */}
      <div className="flex md:hidden items-center justify-between gap-2 pb-2 mb-1.5 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="p-1.5 -ml-1 rounded-lg text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#20242A]" />
            </button>
          )}
          <div 
            onClick={onLogoClick}
            className={`flex items-center gap-1.5 min-w-0 ${onLogoClick ? 'cursor-pointer group' : ''}`}
            title="Return to Migration Overview"
          >
            <div className="w-5 h-5 rounded bg-[#2563EB] group-hover:bg-[#1D4ED8] flex items-center justify-center text-white font-mono font-bold text-xs shrink-0 transition-colors shadow-2xs">
              M
            </div>
            <span className="font-mono font-bold text-xs text-[#20242A] group-hover:text-[#2563EB] truncate transition-colors">
              MIGRATECHECK
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              {workload.targetEngine.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Mobile Fast Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="h-7 px-2 rounded border border-[#D1D5DB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Re-run static checks"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-[#2563EB]' : 'text-[#6B7280]'}`} />
            <span className="hidden xs:inline">Check</span>
          </button>

          <button
            onClick={onExport}
            className="h-7 px-2.5 rounded border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Export Report"
          >
            <FileDown className="w-3 h-3 text-white" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Main Row: Responsive Telemetry Strip & Desktop Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        
        {/* Left Telemetry: Horizontally scrollable on mobile/tablet, piped row on desktop */}
        <div className="flex items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#374151] overflow-x-auto no-scrollbar py-0.5">
          
          <div className="flex items-center gap-1.5 font-bold text-[#20242A] shrink-0">
            <span className="text-[#2563EB]">{migrationId.startsWith('#') ? `Migration ${migrationId}` : migrationId}</span>
          </div>

          <span className="text-[#D1D5DB] hidden md:inline">|</span>

          <div className="flex items-center gap-1 text-[#4B5563] shrink-0">
            <span className="hidden sm:inline">Status:</span>
            <span className={`font-semibold flex items-center gap-0.5 ${isAwaitingInput ? 'text-[#6B7280]' : 'text-[#15803D]'}`}>
              <CheckCircle2 className={`w-3 h-3 ${isAwaitingInput ? 'text-[#6B7280]' : 'text-[#15803D]'}`} />
              <span>{isAnalyzing ? 'Analyzing...' : isAwaitingInput ? 'Awaiting Input' : 'Analyzed'}</span>
            </span>
          </div>

          <span className="text-[#D1D5DB]">|</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline">Risk:</span>
            <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${getRiskColor(overallRisk)}`}>
              {isAwaitingInput ? 'PENDING' : overallRisk}
            </span>
          </div>

          <span className="text-[#D1D5DB]">|</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline">Score:</span>
            <span className="font-bold text-[#20242A]">
              {isAwaitingInput ? '--' : safetyScore} / 100
            </span>
          </div>

          <span className="text-[#D1D5DB]">|</span>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#6B7280]">Findings:</span>
            <span className="text-[#DC2626] font-bold">{criticalCount} Crit</span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-[#D97706] font-bold">{highCount} High</span>
          </div>

          <span className="text-[#D1D5DB]">|</span>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#6B7280] hidden sm:inline">Lock Risk:</span>
            <span className={`font-mono text-[10px] tracking-tight ${lockRisk.color}`}>
              {lockRisk.blocks}
            </span>
            <span className={`font-bold ${lockRisk.color}`}>{lockRisk.label}</span>
          </div>

          <span className="text-[#D1D5DB]">|</span>

          <div className="flex items-center gap-1 text-[#4B5563] shrink-0">
            <span className="text-[#6B7280]">Downtime:</span>
            <strong className="text-[#20242A]">{formattedDowntime}</strong>
          </div>
        </div>

        {/* Right Desktop Action Controls (Hidden on mobile < md as handled above) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Optional Developer Sign In */}
          {user ? (
            <div className="flex items-center gap-1.5 h-7 px-2 bg-[#F3F4F6] rounded border border-[#E5E7EB] text-[11px] font-mono text-[#374151]">
              <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[9px] font-bold">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[100px]" title={user.email}>{user.name || user.email}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-[10px] text-[#9CA3AF] hover:text-[#DC2626] ml-0.5 cursor-pointer"
                  title="Sign out"
                >
                  ✕
                </button>
              )}
            </div>
          ) : onOpenLogin ? (
            <button
              onClick={onOpenLogin}
              className="h-7 px-2 rounded border border-[#D1D5DB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Optional sign-in for migration author tracking"
            >
              <User className="w-3 h-3 text-[#6B7280]" />
              <span className="hidden lg:inline">Sign In</span>
            </button>
          ) : null}

          {onSaveToDb && (
            <button
              onClick={onSaveToDb}
              disabled={isSaved}
              className={`h-7 px-2.5 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                isSaved
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : 'bg-[#FFFFFF] hover:bg-[#F9FAFB] border-[#D1D5DB] text-[#374151]'
              }`}
              title="Persist migration report to PostgreSQL migrations table"
            >
              <span>{isSaved ? '✓ Saved' : 'Save to DB'}</span>
            </button>
          )}

          <button
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="h-7 px-2.5 rounded border border-[#D1D5DB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Re-run static checks"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-[#2563EB]' : 'text-[#6B7280]'}`} />
            <span>Re-evaluate</span>
          </button>

          <button
            onClick={onExport}
            className="h-7 px-2.5 rounded border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Generate PR summary"
          >
            <FileDown className="w-3 h-3 text-white" />
            <span>Export Report</span>
          </button>
        </div>

      </div>
    </div>
  );
};
