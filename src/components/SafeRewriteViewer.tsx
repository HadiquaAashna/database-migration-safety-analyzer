import React, { useState } from 'react';
import { AnalysisReport } from '../types/analyzer';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Layers, 
  Clock, 
  Code2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface SafeRewriteViewerProps {
  report: AnalysisReport;
}

export const SafeRewriteViewer: React.FC<SafeRewriteViewerProps> = ({ report }) => {
  const [activeTab, setActiveTab] = useState<'phases' | 'unified' | 'rollback'>('phases');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const { safeMigrationPhases, unifiedSafeSql, rollbackSql } = report;

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 2000);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB]">
      
      {/* Header & Tabs */}
      <div className="px-3.5 py-2.5 bg-[#F9FAFB] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#20242A] uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            Zero-Downtime Safe Alternative & Expand/Contract Recipe
          </div>
          <div className="text-[11px] text-[#6B7280]">
            Deterministic non-blocking sequence engineered for continuous OLTP traffic
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab('phases')}
            className={`h-6 px-2.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'phases'
                ? 'bg-[#FFFFFF] border-[#15803D] text-[#15803D] font-bold'
                : 'bg-[#FFFFFF] border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>4-Phase Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('unified')}
            className={`h-6 px-2.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'unified'
                ? 'bg-[#FFFFFF] border-[#15803D] text-[#15803D] font-bold'
                : 'bg-[#FFFFFF] border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Unified Script</span>
          </button>

          <button
            onClick={() => setActiveTab('rollback')}
            className={`h-6 px-2.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'rollback'
                ? 'bg-[#FFFFFF] border-[#D97706] text-[#D97706] font-bold'
                : 'bg-[#FFFFFF] border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Rollback DDL</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 4-Phase Expand/Contract Deployment Plan */}
      {activeTab === 'phases' && (
        <div className="p-3.5 space-y-3">
          {safeMigrationPhases.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-[#FFFFFF]">
              <div className="w-9 h-9 rounded bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] mx-auto">
                <Sparkles className="w-5 h-5 text-[#9CA3AF]" />
              </div>
              <h4 className="text-sm font-bold text-[#20242A]">No Safe Rewrite Generated</h4>
              <p className="text-xs text-[#4B5563] max-w-md mx-auto leading-relaxed">
                Enter migration statements in the editor to automatically generate an expand/contract non-blocking plan.
              </p>
            </div>
          ) : (
            safeMigrationPhases.map((phase) => (
              <div
                key={phase.stepNumber}
                className="p-3 rounded border border-[#E5E7EB] bg-[#FFFFFF] hover:border-[#D1D5DB] transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {phase.stepNumber}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#20242A]">{phase.title}</span>
                      <span className="ml-2 text-[10px] font-mono font-semibold text-[#15803D] uppercase">
                        [{phase.phase}]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B7280]">
                    <span className="flex items-center gap-1 text-[#15803D] font-bold">
                      <Clock className="w-3 h-3" />
                      {phase.downtime}
                    </span>
                    <button
                      onClick={() => handleCopy(`phase-${phase.stepNumber}`, phase.sql)}
                      className="h-6 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedState === `phase-${phase.stepNumber}` ? (
                        <>
                          <Check className="w-3 h-3 text-[#15803D]" />
                          <span className="text-[#15803D]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Phase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#374151] leading-relaxed">
                  {phase.explanation}
                </p>

                <div className="text-[11px] font-mono text-[#4B5563] flex items-center gap-1.5">
                  <span className="text-[#6B7280]">Lock Impact:</span>
                  <span className="text-[#D97706] font-semibold">{phase.lockImpact}</span>
                </div>

                <div className="bg-[#111827] text-[#E5E7EB] p-2.5 rounded font-mono text-[11px] overflow-x-auto">
                  <pre><code>{phase.sql}</code></pre>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Unified SQL */}
      {activeTab === 'unified' && (
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#4B5563]">
              Concatenated zero-downtime execution script
            </span>
            {unifiedSafeSql && (
              <button
                onClick={() => handleCopy('unified', unifiedSafeSql)}
                className="h-6 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedState === 'unified' ? (
                  <>
                    <Check className="w-3 h-3 text-[#15803D]" />
                    <span className="text-[#15803D]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Entire Script</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-[#111827] text-[#E5E7EB] p-3 rounded font-mono text-xs overflow-x-auto min-h-[220px]">
            <pre><code>{unifiedSafeSql || '-- No safe rewrite script generated. Enter migration DDL above.'}</code></pre>
          </div>
        </div>
      )}

      {/* Tab 3: Rollback Plan */}
      {activeTab === 'rollback' && (
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#D97706]">
              Safe revert DDL (Non-destructive rollback)
            </span>
            {rollbackSql && (
              <button
                onClick={() => handleCopy('rollback', rollbackSql)}
                className="h-6 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedState === 'rollback' ? (
                  <>
                    <Check className="w-3 h-3 text-[#15803D]" />
                    <span className="text-[#15803D]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Rollback</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-[#111827] text-[#E5E7EB] p-3 rounded font-mono text-xs overflow-x-auto min-h-[200px]">
            <pre><code>{rollbackSql || '-- No rollback statements needed.'}</code></pre>
          </div>
        </div>
      )}

    </div>
  );
};
