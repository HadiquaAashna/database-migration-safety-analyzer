import React from 'react';
import { AnalysisReport } from '../types/analyzer';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Layers
} from 'lucide-react';

interface StatementSummaryPanelProps {
  report: AnalysisReport;
  onSelectStatement?: (line: number) => void;
}

export const StatementSummaryPanel: React.FC<StatementSummaryPanelProps> = ({ 
  report,
  onSelectStatement 
}) => {
  const { parsedStatements, issues, metrics, workload } = report;

  const isAwaiting = parsedStatements.length === 0;

  const checklistItems = isAwaiting ? [
    { title: 'Defensive Lock Timeout', status: 'pending', desc: 'Awaiting SQL statements' },
    { title: 'Index Concurrency', status: 'pending', desc: 'Awaiting SQL statements' },
    { title: 'Table Heap Rewrites', status: 'pending', desc: 'Awaiting SQL statements' },
    { title: 'Expand / Contract Safety', status: 'pending', desc: 'Awaiting SQL statements' },
  ] : [
    {
      title: 'Defensive Lock Timeout',
      status: workload.lockTimeoutMs <= 3000 ? 'pass' : 'warn',
      desc: `${workload.lockTimeoutMs}ms lock timeout prevents cascading OLTP queue stalls`,
    },
    {
      title: 'Index Concurrency',
      status: issues.some((i) => i.ruleId.includes('INDEX')) ? 'fail' : 'pass',
      desc: issues.some((i) => i.ruleId.includes('INDEX'))
        ? 'Non-concurrent index creation detected (blocks writes)'
        : 'All indexes created with CONCURRENTLY / ALGORITHM=INPLACE',
    },
    {
      title: 'Table Heap Rewrites',
      status: metrics.tableRewriteCount > 0 ? 'fail' : 'pass',
      desc: metrics.tableRewriteCount > 0
        ? `${metrics.tableRewriteCount} table rewrite(s) require full disk copy`
        : 'Zero full table disk heap rewrites',
    },
    {
      title: 'Expand / Contract Safety',
      status: issues.some((i) => i.category === 'BACKWARDS_INCOMPATIBLE') ? 'fail' : 'pass',
      desc: issues.some((i) => i.category === 'BACKWARDS_INCOMPATIBLE')
        ? 'Breaks rolling deployment backwards compatibility'
        : 'Fully backwards-compatible with active application instances',
    },
  ];

  return (
    <div className="space-y-3 min-w-0">
      
      {/* Statement AST Sequence Navigator */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB] shadow-xs min-w-0">
        <div className="px-3 py-2 bg-[#F9FAFB] flex items-center justify-between min-w-0 gap-2">
          <div className="text-xs font-mono font-bold text-[#20242A] uppercase flex items-center gap-1.5 min-w-0 truncate">
            <Layers className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span className="truncate">Statements ({parsedStatements.length})</span>
          </div>
          <span className="text-[10px] font-mono text-[#6B7280] shrink-0">
            {isAwaiting ? '0 Tables' : `${metrics.tablesAffected.length} ${metrics.tablesAffected.length === 1 ? 'Table' : 'Tables'}`}
          </span>
        </div>

        <div className="p-2 space-y-1.5 max-h-52 overflow-y-auto font-mono text-xs min-w-0">
          {isAwaiting ? (
            <div className="p-3 text-center text-xs text-[#6B7280]">
              No SQL statements parsed. Enter migration DDL in the editor.
            </div>
          ) : (
            parsedStatements.map((stmt, idx) => {
              const hasIssue = issues.some((i) => i.statementIndex === stmt.index);
              return (
                <div
                  key={idx}
                  onClick={() => onSelectStatement && onSelectStatement(stmt.startLine)}
                  className={`p-2 rounded border transition-colors flex items-center justify-between gap-2 cursor-pointer min-w-0 ${
                    hasIssue
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      hasIssue ? 'bg-[#DC2626] text-white' : 'bg-[#D1D5DB] text-[#374151]'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[11px] truncate text-[#20242A]">
                        {stmt.operationType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-[#6B7280] truncate">
                        Table: <strong className="text-[#374151]">{stmt.targetTable}</strong> (L{stmt.startLine}-{stmt.endLine})
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold truncate max-w-[120px] ${
                      stmt.lockType === 'AccessExclusiveLock' || stmt.lockType === 'MetadataLock_Exclusive'
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                        : stmt.lockType === 'ShareLock'
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                    }`}>
                      {stmt.lockType === 'AccessExclusiveLock' ? 'Exclusive' : stmt.lockType}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Production Concurrency Checklist */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB] shadow-xs min-w-0">
        <div className="px-3 py-2 bg-[#F9FAFB] flex items-center justify-between min-w-0 gap-2">
          <div className="text-xs font-mono font-bold text-[#20242A] uppercase flex items-center gap-1.5 min-w-0 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
            <span className="truncate">Deployment Checklist</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#6B7280] shrink-0">
            {isAwaiting ? '0 / 4 Evaluated' : `${checklistItems.filter((c) => c.status === 'pass').length} / ${checklistItems.length} Pass`}
          </span>
        </div>

        <div className="p-2 space-y-1.5 min-w-0">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className="p-2 rounded bg-[#FFFFFF] border border-[#E5E7EB] flex items-start gap-2 text-xs min-w-0"
            >
              {item.status === 'pass' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
              ) : item.status === 'warn' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
              ) : item.status === 'fail' ? (
                <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 shrink-0 mt-0.5">•</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[11px] text-[#20242A] truncate">{item.title}</div>
                <div className="text-[11px] text-[#4B5563] leading-tight break-words">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
