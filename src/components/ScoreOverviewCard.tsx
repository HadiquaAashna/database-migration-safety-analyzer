import React from 'react';
import { AnalysisReport } from '../types/analyzer';
import { 
  Lock, 
  Clock, 
  HardDrive,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Database
} from 'lucide-react';

interface ScoreOverviewCardProps {
  report: AnalysisReport;
  compact?: boolean;
}

export const ScoreOverviewCard: React.FC<ScoreOverviewCardProps> = ({ report, compact = false }) => {
  const { safetyScore, overallRisk, metrics, issues, workload } = report;

  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = issues.filter((i) => i.severity === 'HIGH').length;

  const hasDataLoss = issues.some((i) => i.category === 'DATA_LOSS' || i.ruleId.includes('DROP'));
  const hasTableRewrite = metrics.tableRewriteCount > 0;
  const hasLockBlocking = issues.some((i) => i.category === 'LOCK_BLOCKING' || i.lockAcquired === 'AccessExclusiveLock');
  const hasCompatRisk = issues.some((i) => i.category === 'BACKWARDS_INCOMPATIBLE');

  const isAwaitingInput = report.parsedStatements.length === 0;

  const getRiskStatus = (risk: string) => {
    if (isAwaitingInput) {
      return {
        label: 'AWAITING SQL INPUT',
        sub: 'Paste or upload migration DDL in the editor to analyze concurrency risks, lock levels, and table rewrites.',
        border: 'border-[#E5E7EB]',
        bg: 'bg-[#F3F4F6]',
        text: 'text-[#4B5563]',
        icon: <Database className="w-4 h-4 text-[#6B7280]" />,
      };
    }
    switch (risk) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL CONCURRENCY RISK',
          sub: 'High probability of query queue stalling and downtime',
          border: 'border-[#FECACA]',
          bg: 'bg-[#FEF2F2]',
          text: 'text-[#DC2626]',
          icon: <AlertOctagon className="w-4 h-4 text-[#DC2626]" />,
        };
      case 'HIGH':
        return {
          label: 'HIGH LOCK CONTENTION',
          sub: 'Non-concurrent DDL blocks active OLTP writes',
          border: 'border-[#FECACA]',
          bg: 'bg-[#FEF2F2]',
          text: 'text-[#DC2626]',
          icon: <AlertTriangle className="w-4 h-4 text-[#DC2626]" />,
        };
      case 'MEDIUM':
        return {
          label: 'MODERATE CONTENTION RISK',
          sub: 'Check lock acquisition order and timeouts',
          border: 'border-[#FDE68A]',
          bg: 'bg-[#FFFBEB]',
          text: 'text-[#D97706]',
          icon: <AlertTriangle className="w-4 h-4 text-[#D97706]" />,
        };
      default:
        return {
          label: 'ZERO-DOWNTIME COMPLIANT',
          sub: 'All DDL statements safe for online production execution',
          border: 'border-[#BBF7D0]',
          bg: 'bg-[#F0FDF4]',
          text: 'text-[#15803D]',
          icon: <ShieldCheck className="w-4 h-4 text-[#15803D]" />,
        };
    }
  };

  const status = getRiskStatus(overallRisk);

  if (compact) {
    return (
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB] shadow-xs min-w-0">
        {/* Compact Header: Score & Status */}
        <div className="p-3 flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Score box */}
            <div className="w-11 h-11 bg-[#F9FAFB] border border-[#D1D5DB] rounded flex flex-col items-center justify-center shrink-0">
              <span className={`text-base font-mono font-bold leading-none ${status.text}`}>
                {isAwaitingInput ? '--' : safetyScore}
              </span>
              <span className="text-[8px] font-mono text-[#6B7280] mt-0.5">/ 100</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${status.bg} ${status.border} ${status.text}`}>
                  {status.icon}
                  <span className="truncate max-w-[150px]">{status.label}</span>
                </span>
                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">
                  {isAwaitingInput ? '[0 stmts]' : `[${issues.length} hazard${issues.length === 1 ? '' : 's'}]`}
                </span>
              </div>
              <p className="text-[11px] text-[#4B5563] mt-1 leading-snug line-clamp-2">
                {report.summaryText}
              </p>
            </div>
          </div>
        </div>

        {/* Compact 3-metric strip (guaranteed 100% container fit) */}
        <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] bg-[#F9FAFB] text-center font-mono py-1.5 text-xs min-w-0">
          <div className="px-1 min-w-0">
            <div className="text-[9px] text-[#6B7280] uppercase truncate">Est. Downtime</div>
            <div className="font-bold text-[11px] text-[#20242A] truncate">
              {isAwaitingInput ? '--' : metrics.estimatedDowntimeMaxSeconds === 0 ? '0s' : `~${metrics.estimatedDowntimeMaxSeconds}s`}
            </div>
          </div>
          <div className="px-1 min-w-0">
            <div className="text-[9px] text-[#6B7280] uppercase truncate">Highest Lock</div>
            <div className={`font-bold text-[11px] truncate ${isAwaitingInput ? 'text-[#6B7280]' : 'text-[#DC2626]'}`} title={metrics.highestLockAcquired}>
              {isAwaitingInput ? 'None' : metrics.highestLockAcquired}
            </div>
          </div>
          <div className="px-1 min-w-0">
            <div className="text-[9px] text-[#6B7280] uppercase truncate">Rewrites</div>
            <div className="font-bold text-[11px] text-[#20242A]">
              {isAwaitingInput ? '--' : metrics.tableRewriteCount}
            </div>
          </div>
        </div>

        {/* Concrete Safety Checks (2 columns for side-panel) */}
        <div className="p-2.5 bg-[#F9FAFB]/50 min-w-0">
          <div className="text-[10px] font-mono uppercase text-[#6B7280] font-bold mb-2 flex items-center justify-between flex-wrap gap-1">
            <span>Concrete Safety Checks</span>
            <span className="text-[9px] font-normal">{workload.targetEngine.toUpperCase()} • {(workload.estimatedRowCount / 1_000_000).toFixed(1)}M Rows</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono min-w-0">
            {/* Check 1: Lock Risk */}
            <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasLockBlocking ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between text-[11px] gap-1">
                <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                  <Lock className="w-3 h-3 text-[#DC2626] shrink-0" />
                  <span className="truncate">Lock Risk</span>
                </span>
                <span className={`shrink-0 text-[10px] ${isAwaitingInput ? 'text-[#6B7280]' : hasLockBlocking ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                  {isAwaitingInput ? 'PENDING' : hasLockBlocking ? 'HIGH RISK' : 'NON-BLOCKING'}
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 font-sans line-clamp-1">
                {isAwaitingInput ? 'Awaiting statements' : metrics.highestLockAcquired === 'AccessExclusiveLock' ? 'Blocks reads & writes' : 'Shared read safe'}
              </div>
            </div>

            {/* Check 2: Table Rewrite */}
            <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasTableRewrite ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between text-[11px] gap-1">
                <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                  <HardDrive className="w-3 h-3 text-[#2563EB] shrink-0" />
                  <span className="truncate">Table Rewrite</span>
                </span>
                <span className={`shrink-0 text-[10px] ${isAwaitingInput ? 'text-[#6B7280]' : hasTableRewrite ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                  {isAwaitingInput ? 'PENDING' : hasTableRewrite ? `${metrics.tableRewriteCount} REWRITE` : 'ZERO REWRITE'}
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 font-sans line-clamp-1">
                {isAwaitingInput ? 'Awaiting statements' : hasTableRewrite ? 'Full disk heap copy' : 'Metadata-only fast alter'}
              </div>
            </div>

            {/* Check 3: Data Loss Risk */}
            <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasDataLoss ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between text-[11px] gap-1">
                <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                  <AlertOctagon className="w-3 h-3 text-[#DC2626] shrink-0" />
                  <span className="truncate">Data Loss</span>
                </span>
                <span className={`shrink-0 text-[10px] ${isAwaitingInput ? 'text-[#6B7280]' : hasDataLoss ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                  {isAwaitingInput ? 'PENDING' : hasDataLoss ? 'DESTRUCTIVE' : 'SAFE'}
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 font-sans line-clamp-1">
                {isAwaitingInput ? 'Awaiting statements' : hasDataLoss ? 'Irreversible drop' : 'Zero dropped columns'}
              </div>
            </div>

            {/* Check 4: Backwards Compatibility */}
            <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasCompatRisk ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between text-[11px] gap-1">
                <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                  <Database className="w-3 h-3 text-[#D97706] shrink-0" />
                  <span className="truncate">Compatibility</span>
                </span>
                <span className={`shrink-0 text-[10px] ${isAwaitingInput ? 'text-[#6B7280]' : hasCompatRisk ? 'text-[#D97706] font-bold' : 'text-[#15803D] font-bold'}`}>
                  {isAwaitingInput ? 'PENDING' : hasCompatRisk ? 'HAZARD' : 'SAFE ROLLING'}
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 font-sans line-clamp-1">
                {isAwaitingInput ? 'Awaiting statements' : hasCompatRisk ? 'Breaks previous queries' : 'Expand-contract safe'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB] shadow-xs min-w-0">
      
      {/* Top Banner: Score & Summary */}
      <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Engineering score box */}
          <div className="w-14 h-14 bg-[#F9FAFB] border border-[#D1D5DB] rounded flex flex-col items-center justify-center shrink-0">
            <span className={`text-xl font-mono font-bold ${status.text}`}>
              {isAwaitingInput ? '--' : safetyScore}
            </span>
            <span className="text-[9px] font-mono text-[#6B7280]">/ 100</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${status.bg} ${status.border} ${status.text}`}>
                {status.icon}
                <span>{status.label}</span>
              </span>
              <span className="text-[11px] font-mono text-[#6B7280]">
                {isAwaitingInput ? '[0 statements]' : `[${issues.length} hazard${issues.length === 1 ? '' : 's'}]`}
              </span>
            </div>
            <p className="text-xs text-[#374151] mt-1 leading-snug">
              {report.summaryText}
            </p>
          </div>
        </div>

        {/* Compact stats strip */}
        <div className="flex items-center gap-3 text-xs font-mono text-[#4B5563] bg-[#F9FAFB] px-3 py-2 rounded border border-[#E5E7EB] shrink-0">
          <div>
            <div className="text-[10px] text-[#6B7280] uppercase">Est. Downtime</div>
            <div className="font-bold text-[#20242A]">
              {isAwaitingInput ? '--' : metrics.estimatedDowntimeMaxSeconds === 0 ? '0s' : `~${metrics.estimatedDowntimeMaxSeconds}s`}
            </div>
          </div>
          <div className="w-px h-6 bg-[#D1D5DB]" />
          <div>
            <div className="text-[10px] text-[#6B7280] uppercase">Highest Lock</div>
            <div className={`font-bold truncate max-w-[120px] ${isAwaitingInput ? 'text-[#6B7280]' : 'text-[#DC2626]'}`} title={metrics.highestLockAcquired}>
              {isAwaitingInput ? 'None' : metrics.highestLockAcquired}
            </div>
          </div>
          <div className="w-px h-6 bg-[#D1D5DB]" />
          <div>
            <div className="text-[10px] text-[#6B7280] uppercase">Table Rewrites</div>
            <div className="font-bold text-[#20242A]">
              {isAwaitingInput ? '--' : metrics.tableRewriteCount}
            </div>
          </div>
        </div>
      </div>

      {/* Concrete Engineering Findings Breakdown */}
      <div className="p-3 bg-[#F9FAFB]/50 min-w-0">
        <div className="text-[10px] font-mono uppercase text-[#6B7280] font-bold mb-2 flex items-center justify-between flex-wrap gap-1">
          <span>Concrete Safety Checks (Static SQL & Engine Rules)</span>
          <span>Target: {workload.targetEngine.toUpperCase()} • {(workload.estimatedRowCount / 1_000_000).toFixed(1)}M Rows</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono min-w-0">
          
          {/* Check 1: Lock Risk */}
          <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasLockBlocking ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between text-[11px] gap-1">
              <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                <Lock className="w-3 h-3 text-[#DC2626] shrink-0" />
                <span className="truncate">Lock Contention</span>
              </span>
              <span className={`shrink-0 ${isAwaitingInput ? 'text-[#6B7280]' : hasLockBlocking ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                {isAwaitingInput ? 'PENDING' : hasLockBlocking ? 'HIGH RISK' : 'NON-BLOCKING'}
              </span>
            </div>
            <div className="text-[10px] text-[#6B7280] mt-1 font-sans truncate">
              {isAwaitingInput ? 'Awaiting statements' : metrics.highestLockAcquired === 'AccessExclusiveLock' ? 'Blocks reads & writes' : 'Shared read safe'}
            </div>
          </div>

          {/* Check 2: Table Rewrite */}
          <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasTableRewrite ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between text-[11px] gap-1">
              <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                <HardDrive className="w-3 h-3 text-[#2563EB] shrink-0" />
                <span className="truncate">Table Rewrite</span>
              </span>
              <span className={`shrink-0 ${isAwaitingInput ? 'text-[#6B7280]' : hasTableRewrite ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                {isAwaitingInput ? 'PENDING' : hasTableRewrite ? `${metrics.tableRewriteCount} REWRITE` : 'ZERO REWRITE'}
              </span>
            </div>
            <div className="text-[10px] text-[#6B7280] mt-1 font-sans truncate">
              {isAwaitingInput ? 'Awaiting statements' : hasTableRewrite ? 'Full disk heap copy required' : 'Metadata-only fast alteration'}
            </div>
          </div>

          {/* Check 3: Data Loss Risk */}
          <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasDataLoss ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between text-[11px] gap-1">
              <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                <AlertOctagon className="w-3 h-3 text-[#DC2626] shrink-0" />
                <span className="truncate">Data Loss Risk</span>
              </span>
              <span className={`shrink-0 ${isAwaitingInput ? 'text-[#6B7280]' : hasDataLoss ? 'text-[#DC2626] font-bold' : 'text-[#15803D] font-bold'}`}>
                {isAwaitingInput ? 'PENDING' : hasDataLoss ? 'DESTRUCTIVE' : 'NON-DESTRUCTIVE'}
              </span>
            </div>
            <div className="text-[10px] text-[#6B7280] mt-1 font-sans truncate">
              {isAwaitingInput ? 'Awaiting statements' : hasDataLoss ? 'Irreversible column/table drop' : 'Zero dropped columns or tables'}
            </div>
          </div>

          {/* Check 4: Backwards Compatibility */}
          <div className={`p-2 rounded border min-w-0 ${isAwaitingInput ? 'bg-[#FFFFFF] border-[#E5E7EB]' : hasCompatRisk ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-[#FFFFFF] border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between text-[11px] gap-1">
              <span className="text-[#4B5563] flex items-center gap-1 min-w-0">
                <Database className="w-3 h-3 text-[#D97706] shrink-0" />
                <span className="truncate">App Compatibility</span>
              </span>
              <span className={`shrink-0 ${isAwaitingInput ? 'text-[#6B7280]' : hasCompatRisk ? 'text-[#D97706] font-bold' : 'text-[#15803D] font-bold'}`}>
                {isAwaitingInput ? 'PENDING' : hasCompatRisk ? 'DEPLOY HAZARD' : 'SAFE FOR ROLLING'}
              </span>
            </div>
            <div className="text-[10px] text-[#6B7280] mt-1 font-sans truncate">
              {isAwaitingInput ? 'Awaiting statements' : hasCompatRisk ? 'Breaks previous app version queries' : 'Expand-contract compliant'}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
