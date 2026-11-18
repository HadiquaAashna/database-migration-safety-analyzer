import React, { useState } from 'react';
import { AnalysisReport } from '../types/analyzer';
import { X, Copy, Check, Download, FileText, Code2 } from 'lucide-react';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AnalysisReport;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdownReport = (): string => {
    const lines: string[] = [
      `# 🛡️ MIGRATECHECK — Database Migration Safety Audit Report`,
      ``,
      `**Migration Status:** Complete | **Verdict:** \`${report.overallRisk}\` (Score: **${report.safetyScore}/100**)  `,
      `**Target Engine:** \`${report.workload.targetEngine.toUpperCase()}\` | **Workload:** \`${(report.workload.estimatedRowCount / 1_000_000).toFixed(1)}M rows\` | **Defensive Timeout:** \`${report.workload.lockTimeoutMs}ms\`  `,
      `**Estimated Downtime:** \`${report.metrics.estimatedDowntimeMinSeconds}s - ${report.metrics.estimatedDowntimeMaxSeconds}s\` | **Peak Lock:** \`${report.metrics.highestLockAcquired}\``,
      ``,
      `---`,
      `### 📊 Concrete Safety Evaluation`,
      `| Metric | Status | Finding |`,
      `|---|---|---|`,
      `| 🔒 Lock Contention | ${report.scoreBreakdown.lockContention >= 80 ? '✅ Pass' : '⚠️ Contention Risk'} | Peak Lock: ${report.metrics.highestLockAcquired} |`,
      `| ⏱️ Table Rewrite | ${report.scoreBreakdown.tableRewrite >= 80 ? '✅ Zero Rewrites' : '⚠️ Disk Repacking'} | Rewrites: ${report.metrics.tableRewriteCount} tables |`,
      `| 🔄 App Backwards Compatibility | ${report.scoreBreakdown.backwardsCompatibility >= 80 ? '✅ Compatible' : '⚠️ Breaking DDL'} | Expand/Contract pod safety |`,
      `| 💥 Reversibility & Rollback | ${report.scoreBreakdown.rollbackReadiness >= 80 ? '✅ Reversible' : '⚠️ Irreversible'} | Rollback plan availability |`,
      ``,
      `---`,
      `### 🚨 Detected Hazards (${report.issues.length})`,
    ];

    if (report.issues.length === 0) {
      lines.push(`*No blocking issues detected. Zero-downtime deployment approved.*`);
    } else {
      report.issues.forEach((issue, idx) => {
        lines.push(`#### ${idx + 1}. [${issue.severity}] ${issue.title} (Line ${issue.line})`);
        lines.push(`- **Lock Mode:** \`${issue.lockAcquired}\``);
        lines.push(`- **Impact:** ${issue.description}`);
        lines.push(`- **Engine Internals:** ${issue.dbInternalsExplanation}`);
        lines.push(`- **Recommended Safe Fix:** \n\`\`\`sql\n${issue.safeAlternativeSql}\n\`\`\``);
        lines.push(``);
      });
    }

    lines.push(`---`);
    lines.push(`### Recommended Zero-Downtime Safe Alternative`);
    lines.push(`\`\`\`sql\n${report.unifiedSafeSql}\n\`\`\``);
    lines.push(``);
    lines.push(`### Rollback DDL`);
    lines.push(`\`\`\`sql\n${report.rollbackSql}\n\`\`\``);

    return lines.join('\n');
  };

  const reportText =
    format === 'markdown'
      ? generateMarkdownReport()
      : JSON.stringify(report, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `migratecheck-audit-report.${format === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-2xs">
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-lg w-full max-w-4xl shadow-xl overflow-hidden flex flex-col h-[90dvh] sm:h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[#D1D5DB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded bg-[#2563EB] text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-mono font-bold text-[#20242A] uppercase truncate">
                MIGRATECHECK Audit Report
              </h2>
              <p className="text-[11px] text-[#6B7280] truncate">
                Pre-execution safety summary for Pull Request review & DBA signoff
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="px-3 sm:px-4 py-2 bg-[#F3F4F6] border-b border-[#D1D5DB] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#6B7280]">Format:</span>
            <div className="flex items-center bg-[#FFFFFF] border border-[#D1D5DB] rounded p-0.5">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  format === 'markdown'
                    ? 'bg-[#2563EB] text-white font-bold'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  format === 'json'
                    ? 'bg-[#2563EB] text-white font-bold'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                JSON Payload (.json)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="h-7 px-2.5 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="h-7 px-2.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#111827] text-[#E5E7EB] p-4 overflow-auto font-mono text-xs leading-relaxed">
          <pre><code>{reportText}</code></pre>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#F9FAFB] border-t border-[#D1D5DB] flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
          <span>Generated by MIGRATECHECK Static Analysis Pipeline</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#FFFFFF] border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
