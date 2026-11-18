import React, { useState } from 'react';
import { DetectedIssue, RiskLevel } from '../types/analyzer';
import { 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowRight
} from 'lucide-react';

interface IssuesListProps {
  issues: DetectedIssue[];
  selectedLine?: number | null;
  onSelectIssue?: (issue: DetectedIssue) => void;
  totalStatements?: number;
}

export const IssuesList: React.FC<IssuesListProps> = ({ 
  issues, 
  selectedLine,
  onSelectIssue,
  totalStatements,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(issues[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = issues.filter((i) => {
    if (filterSeverity === 'ALL') return true;
    return i.severity === filterSeverity;
  });

  const getSeverityBadge = (sev: RiskLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 text-[#DC2626]" />,
          badgeClass: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
        };
      case 'HIGH':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />,
          badgeClass: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
        };
      case 'MEDIUM':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />,
          badgeClass: 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]',
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-[#2563EB]" />,
          badgeClass: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]',
        };
    }
  };

  const counts = {
    ALL: issues.length,
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: issues.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: issues.filter((i) => i.severity === 'MEDIUM').length,
  };

  if (issues.length === 0) {
    if (totalStatements === 0) {
      return (
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded p-8 text-center space-y-2.5">
          <div className="w-9 h-9 rounded bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] mx-auto">
            <Info className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#20242A]">No Migration Statements Analyzed</h4>
          <p className="text-xs text-[#4B5563] max-w-md mx-auto leading-relaxed">
            Enter or paste migration DDL statements in the editor to inspect for table write locks, disk repacking, and replication risks.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded p-8 text-center space-y-2.5">
        <div className="w-9 h-9 rounded bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D] mx-auto">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-[#20242A]">Zero Migration Hazards Detected</h4>
        <p className="text-xs text-[#4B5563] max-w-md mx-auto leading-relaxed">
          All statements adhere to non-blocking concurrency standards. No table-level write locks, non-concurrent indexes, or destructive drops found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded flex flex-col overflow-hidden">
      
      {/* Header Bar with Filter Tabs */}
      <div className="px-3.5 py-2.5 bg-[#F9FAFB] border-b border-[#D1D5DB] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#20242A] uppercase tracking-wide">
            Migration Findings ({issues.length})
          </span>
          <span className="text-[11px] text-[#6B7280]">
            • Static static lock & rewrite analysis
          </span>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`h-6 px-2 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-[#FFFFFF] border-[#2563EB] text-[#2563EB] font-bold'
                  : 'bg-[#FFFFFF] border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]'
              }`}
            >
              <span>{sev}</span>
              <span className="text-[10px] text-[#6B7280]">({counts[sev] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Engineering Table View (replaces wall of cards) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F3F4F6] border-b border-[#D1D5DB] font-mono text-[11px] text-[#4B5563] uppercase">
              <th className="py-2 px-3 w-8">#</th>
              <th className="py-2 px-3 w-24">Severity</th>
              <th className="py-2 px-3 w-16">Line</th>
              <th className="py-2 px-3 w-32">Target Object</th>
              <th className="py-2 px-3">Operation / Finding</th>
              <th className="py-2 px-3 w-40">Lock Mode</th>
              <th className="py-2 px-3 w-20 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] font-mono text-[12px]">
            {filtered.map((issue, idx) => {
              const isExpanded = expandedId === issue.id;
              const badge = getSeverityBadge(issue.severity);

              return (
                <React.Fragment key={issue.id}>
                  <tr 
                    onClick={() => {
                      setExpandedId(isExpanded ? null : issue.id);
                      if (onSelectIssue) onSelectIssue(issue);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isExpanded 
                        ? 'bg-[#F9FAFB]' 
                        : 'hover:bg-[#F9FAFB]/80'
                    }`}
                  >
                    <td className="py-2 px-3 text-[#9CA3AF] text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.badgeClass}`}>
                        {badge.icon}
                        <span>{issue.severity}</span>
                      </span>
                    </td>

                    <td className="py-2 px-3 font-bold text-[#2563EB]">
                      L{issue.line}
                    </td>

                    <td className="py-2 px-3 text-[#20242A] font-semibold truncate max-w-[140px]">
                      {issue.table || 'database'}
                    </td>

                    <td className="py-2 px-3 font-sans text-xs text-[#20242A]">
                      <div className="font-semibold">{issue.title}</div>
                      <div className="text-[11px] text-[#6B7280] truncate max-w-[400px]">
                        {issue.description}
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono text-[11px] text-[#DC2626]">
                      {issue.lockAcquired}
                    </td>

                    <td className="py-2 px-3 text-right">
                      <button 
                        className="text-[#2563EB] hover:text-[#1D4ED8] font-mono text-[11px] flex items-center justify-end gap-0.5 ml-auto cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Technical Explanation Row (Step 4 — Explain the problem) */}
                  {isExpanded && (
                    <tr className="bg-[#F8FAFC]">
                      <td colSpan={7} className="p-4 border-b border-[#D1D5DB] border-l-2 border-l-[#2563EB]">
                        <div className="space-y-3 font-sans">
                          
                          {/* Heading: What triggered it */}
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono font-bold text-[#DC2626] uppercase flex items-center gap-1.5">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              {issue.severity} FINDING: {issue.title}
                            </div>
                            <div className="p-2 bg-[#FFFFFF] border border-[#D1D5DB] rounded font-mono text-xs text-[#20242A] overflow-x-auto">
                              <code>{issue.rawSql}</code>
                            </div>
                          </div>

                          {/* Technical Breakdown: Risk, Impact, Internals */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded space-y-1">
                              <div className="font-mono text-[11px] font-bold text-[#DC2626] uppercase">
                                Risk & Concurrency Impact
                              </div>
                              <p className="text-[#374151] leading-relaxed">
                                {issue.description}
                              </p>
                              <div className="text-[11px] font-mono text-[#6B7280] pt-1">
                                Est. Contention Window: <strong className="text-[#20242A]">{issue.estimatedHoldTime}</strong>
                              </div>
                            </div>

                            <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded space-y-1">
                              <div className="font-mono text-[11px] font-bold text-[#4B5563] uppercase">
                                Database Engine Internals
                              </div>
                              <p className="text-[#4B5563] leading-relaxed">
                                {issue.dbInternalsExplanation}
                              </p>
                              <div className="text-[11px] font-mono text-[#4B5563] pt-1">
                                Blocked Ops: {issue.blockedOps.select ? 'SELECT ' : ''}{issue.blockedOps.insert ? 'INSERT ' : ''}{issue.blockedOps.update ? 'UPDATE ' : ''}{issue.blockedOps.delete ? 'DELETE' : ''}
                              </div>
                            </div>
                          </div>

                          {/* Recommended Approach & Safe Alternative */}
                          <div className="p-3 bg-[#FFFFFF] border border-[#BBF7D0] rounded space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-[11px] font-bold text-[#15803D] uppercase flex items-center gap-1">
                                <span>Recommended Approach (Zero-Downtime Safe Pattern):</span>
                              </div>
                              <button
                                onClick={() => handleCopy(issue.id, issue.safeAlternativeSql)}
                                className="h-6 px-2 rounded bg-[#FFFFFF] hover:bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedId === issue.id ? <Check className="w-3 h-3 text-[#15803D]" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === issue.id ? 'Copied' : 'Copy Safe SQL'}</span>
                              </button>
                            </div>

                            <p className="text-xs text-[#1F2937] leading-relaxed font-mono bg-[#F0FDF4]/50 p-2 rounded border border-[#DCFCE7]">
                              {issue.safeAlternative}
                            </p>

                            <div className="bg-[#111827] text-[#E5E7EB] p-2.5 rounded font-mono text-[11px] overflow-x-auto">
                              <pre><code>{issue.safeAlternativeSql}</code></pre>
                            </div>

                            {issue.docsReference && (
                              <div className="pt-1 text-[11px] text-[#6B7280] flex items-center gap-1.5 flex-wrap">
                                <ExternalLink className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                                <span className="text-[#4B5563]">Reference:</span>
                                <a
                                  href={issue.docsReference}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#2563EB] hover:underline font-mono truncate max-w-xs sm:max-w-md inline-block"
                                  title={issue.docsReference}
                                >
                                  {issue.docsReference}
                                </a>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-3 py-2 bg-[#F9FAFB] border-t border-[#D1D5DB] flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
        <span>Showing {filtered.length} of {issues.length} detected hazard{issues.length === 1 ? '' : 's'}</span>
        <span className="text-[#20242A]">Click any row to inspect engine internals and non-blocking alternatives</span>
      </div>

    </div>
  );
};
