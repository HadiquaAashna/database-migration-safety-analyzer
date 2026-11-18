import React, { useRef, useState } from 'react';
import { SAMPLE_MIGRATIONS } from '../services/sampleMigrations';
import { DatabaseEngine, DetectedIssue } from '../types/analyzer';
import { 
  Play, 
  UploadCloud, 
  RotateCcw, 
  FileCode, 
  Layers,
  AlertOctagon,
  AlertTriangle,
  Info,
  Check,
  Copy
} from 'lucide-react';

interface SqlEditorPanelProps {
  sql: string;
  setSql: (sql: string) => void;
  targetEngine: DatabaseEngine;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onSelectSample: (sampleId: string) => void;
  selectedSampleId: string;
  issues?: DetectedIssue[];
  onSelectIssueLine?: (line: number) => void;
}

export const SqlEditorPanel: React.FC<SqlEditorPanelProps> = ({
  sql,
  setSql,
  targetEngine,
  onAnalyze,
  isAnalyzing,
  onSelectSample,
  selectedSampleId,
  issues = [],
  onSelectIssueLine,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSql(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setSql(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlLines = sql.split('\n');
  const totalLines = Math.max(16, sqlLines.length);
  const lineNumbers = Array.from({ length: totalLines }, (_, i) => i + 1);

  // Map issues to lines
  const issuesByLine: Record<number, DetectedIssue[]> = {};
  issues.forEach((issue) => {
    const lineNum = issue.line || 1;
    if (!issuesByLine[lineNum]) {
      issuesByLine[lineNum] = [];
    }
    issuesByLine[lineNum].push(issue);
  });

  return (
    <div 
      className={`bg-[#FFFFFF] border border-[#D1D5DB] rounded flex flex-col h-full overflow-hidden transition-all ${
        isDragOver ? 'border-[#2563EB] ring-2 ring-blue-100' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Workbench Tab bar / Editor Toolbar */}
      <div className="p-2 sm:px-3 sm:py-2 border-b border-[#D1D5DB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none min-w-0">
        
        {/* Left: Preset Selector & Migration Title */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
          <span className="text-[11px] font-mono font-semibold text-[#4B5563] flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden xs:inline">Preset:</span>
          </span>
          <select
            value={selectedSampleId}
            onChange={(e) => onSelectSample(e.target.value)}
            className="h-8 sm:h-7 bg-[#FFFFFF] border border-[#D1D5DB] hover:border-[#9CA3AF] rounded px-2 text-xs text-[#20242A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] w-full max-w-full sm:max-w-sm truncate transition-colors cursor-pointer font-mono"
          >
            <option value="custom">-- Custom SQL Input --</option>
            {SAMPLE_MIGRATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.expectedRisk})
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".sql,.txt,.prisma,.ddl"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 sm:h-7 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            title="Upload .sql migration script"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button
            onClick={handleCopy}
            className="h-8 sm:h-7 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#374151] text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            title="Copy SQL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5 text-[#6B7280]" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => {
              setSql('');
              if (selectedSampleId !== 'custom') {
                onSelectSample('custom');
              }
            }}
            className="h-8 sm:h-7 w-8 sm:w-7 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#6B7280] hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer"
            title="Clear editor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !sql.trim()}
            className={`h-8 sm:h-7 px-3 rounded text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isAnalyzing || !sql.trim()
                ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed border border-[#D1D5DB]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
            }`}
          >
            <Play className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : 'fill-current'}`} />
            <span>{isAnalyzing ? 'Evaluating...' : 'Analyze SQL'}</span>
          </button>
        </div>

      </div>

      {/* Editor Body: Resembles genuine IDE with line numbers & inline risk markers */}
      <div className="relative flex-1 flex bg-[#FFFFFF] font-mono text-xs overflow-hidden min-h-[280px] sm:min-h-[380px]">
        
        {/* Code gutter with line numbers and hazard indicators */}
        <div className="w-10 sm:w-12 bg-[#F9FAFB] border-r border-[#D1D5DB] py-2 sm:py-2.5 select-none text-right pr-1.5 sm:pr-2 text-[#9CA3AF] font-mono text-[10px] sm:text-[11px] leading-[22px] shrink-0">
          {lineNumbers.map((num) => {
            const lineIssues = issuesByLine[num];
            const hasCritical = lineIssues?.some((i) => i.severity === 'CRITICAL');
            const hasWarning = lineIssues?.some((i) => i.severity === 'HIGH' || i.severity === 'MEDIUM');

            return (
              <div 
                key={num} 
                className="flex items-center justify-end gap-1 group cursor-pointer"
                onClick={() => onSelectIssueLine && lineIssues && onSelectIssueLine(num)}
              >
                {hasCritical ? (
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] inline-block shrink-0" title={`Critical hazard on line ${num}`} />
                ) : hasWarning ? (
                  <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block shrink-0" title={`Warning on line ${num}`} />
                ) : (
                  <span className="w-2 inline-block" />
                )}
                <span className={lineIssues ? 'text-[#DC2626] font-bold' : 'text-[#9CA3AF]'}>
                  {num}
                </span>
              </div>
            );
          })}
        </div>

        {/* SQL Text Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#FFFFFF] min-w-0">
          <textarea
            value={sql}
            onChange={(e) => {
              setSql(e.target.value);
              if (selectedSampleId !== 'custom') {
                onSelectSample('custom');
              }
            }}
            placeholder="-- Enter or paste your SQL migration statements here (e.g. ALTER TABLE, CREATE INDEX, etc.)..."
            spellCheck={false}
            className="w-full h-full p-2.5 text-[#20242A] resize-none focus:outline-none font-mono text-xs sm:text-[13px] leading-[22px] tracking-tight placeholder:text-[#9CA3AF] selection:bg-[#DBEAFE] selection:text-[#1E3A8A] overflow-y-auto"
          />

          {/* Inline Risk Markers Tray */}
          {issues.length > 0 && (
            <div className="border-t border-[#E5E7EB] bg-[#FEF2F2]/60 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-mono text-[#374151] flex flex-wrap items-center gap-2">
              <span className="text-[#DC2626] font-bold flex items-center gap-1 shrink-0">
                <AlertOctagon className="w-3.5 h-3.5" />
                Markers ({issues.length}):
              </span>
              {issues.slice(0, 3).map((issue) => (
                <div 
                  key={issue.id}
                  onClick={() => onSelectIssueLine && onSelectIssueLine(issue.line)}
                  className="flex items-center gap-1 bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#FECACA] cursor-pointer hover:border-[#DC2626] transition-colors min-w-0"
                >
                  <span className="text-[#DC2626] font-bold shrink-0">L{issue.line}:</span>
                  <span className="text-[#20242A] truncate max-w-[130px] sm:max-w-[200px]">{issue.title}</span>
                  <span className="text-[9px] text-[#6B7280] hidden sm:inline">[{issue.lockAcquired}]</span>
                </div>
              ))}
              {issues.length > 3 && (
                <span className="text-[10px] text-[#6B7280] shrink-0">
                  +{issues.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Editor Status Bar */}
      <div className="px-2.5 sm:px-3 py-1.5 bg-[#F9FAFB] border-t border-[#D1D5DB] flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#6B7280] gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-[#374151]">
            <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
            {sql.split('\n').length} lines
          </span>
          <span className="text-[#D1D5DB]">•</span>
          <span>{sql.length.toLocaleString()} chars</span>
          <span className="text-[#D1D5DB] hidden sm:inline">•</span>
          <span className="font-semibold text-[#20242A] hidden sm:inline">{targetEngine.toUpperCase()} SQL</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#15803D]" />
          <span>AST Ready</span>
        </div>
      </div>
    </div>
  );
};
