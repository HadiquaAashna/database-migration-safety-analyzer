import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  stepStatus?: {
    parsing: boolean;
    locks: boolean;
    rewrites: boolean;
    dataLoss: boolean;
    downtime: boolean;
  };
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ isAnalyzing }) => {
  const steps = [
    { label: 'Parsing SQL', dots: '.............' },
    { label: 'Checking locks', dots: '..........' },
    { label: 'Checking table rewrites', dots: '.' },
    { label: 'Checking data loss', dots: '......' },
    { label: 'Estimating downtime', dots: '.....' },
  ];

  return (
    <div className="bg-[#111827] text-[#9CA3AF] font-mono text-[11px] px-3.5 py-1.5 border-b border-[#374151] flex items-center justify-between overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-2">
        <span className="text-[#3B82F6] font-bold">[STATIC PIPELINE]</span>
        <div className="flex items-center gap-2 text-slate-300">
          {steps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <span className="text-slate-300">
                {step.label} <span className="text-slate-600">{step.dots}</span>
              </span>
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 text-[#3B82F6] animate-spin inline-block" />
              ) : (
                <span className="text-[#10B981] font-bold">✓</span>
              )}
              {idx < steps.length - 1 && <span className="text-slate-600">|</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <span className="text-[#6B7280] text-[10px] hidden md:inline">
        AST Engine: postgres-parser v4.1
      </span>
    </div>
  );
};
