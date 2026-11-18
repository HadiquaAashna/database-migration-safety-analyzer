import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar, ActiveView } from './components/Sidebar';
import { StatusHeader } from './components/StatusHeader';
import { AnalysisProgress } from './components/AnalysisProgress';
import { SqlEditorPanel } from './components/SqlEditorPanel';
import { ScoreOverviewCard } from './components/ScoreOverviewCard';
import { LockMatrixView } from './components/LockMatrixView';
import { IssuesList } from './components/IssuesList';
import { SafeRewriteViewer } from './components/SafeRewriteViewer';
import { StatementSummaryPanel } from './components/StatementSummaryPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { WorkloadConfigModal } from './components/WorkloadConfigDrawer';
import { DryRunSimulator } from './components/DryRunSimulator';
import { RulesExplorerModal } from './components/RulesExplorerModal';
import { ReportExportModal } from './components/ReportExportModal';
import { LoginModal, AuthUser } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastProvider, useToast } from './components/Toast';
import { NotFoundPage } from './components/NotFoundPage';

import { analyzeMigration } from './services/analyzerEngine';
import { SAMPLE_MIGRATIONS } from './services/sampleMigrations';
import { WorkloadProfile, AnalysisReport, DatabaseEngine } from './types/analyzer';
import { checkBackendHealth, saveMigrationToDatabase } from './services/api';

import { 
  ShieldAlert, 
  Lock, 
  Sparkles, 
  FileCode2, 
  Sliders, 
  PlayCircle,
  Database,
  Clock,
  Layers,
  CheckCircle2,
  Phone,
  Mail,
  HelpCircle
} from 'lucide-react';

function AppWorkbench() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // Navigation View State
  const [activeView, setActiveView] = useState<ActiveView>('overview');

  // Workload profile state
  const [workload, setWorkload] = useState<WorkloadProfile>({
    targetEngine: 'postgres',
    estimatedRowCount: 12_000_000,
    estimatedTableSizeBytes: 12_000_000 * 250,
    peakQps: 2500,
    lockTimeoutMs: 2000,
    environment: 'production-critical',
  });

  // Selected sample & SQL input (starts clean with no preloaded mock SQL)
  const [selectedSampleId, setSelectedSampleId] = useState<string>('custom');
  const [sql, setSql] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const migrationId = useMemo(() => {
    if (selectedSampleId !== 'custom') {
      return selectedSampleId;
    }
    return sql.trim() ? '#0001' : 'Draft';
  }, [selectedSampleId, sql]);

  // Active View Tab in Right Panel (when on overview view)
  const [activeOverviewTab, setActiveOverviewTab] = useState<'findings' | 'rewrite' | 'matrix'>('findings');

  // Database and API connection state
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Check PostgreSQL and backend health on mount and every 10s
  useEffect(() => {
    const checkHealth = () => {
      checkBackendHealth().then((res) => {
        if (res) {
          setApiOnline(true);
          if (res.database && res.database.connected) {
            setDbConnected(true);
          } else {
            setDbConnected(false);
          }
        } else {
          setApiOnline(false);
          setDbConnected(false);
        }
      });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // User Authentication & Modals state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('migratecheck_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Responsive mobile menu & desktop sidebar collapse states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Run analysis when SQL or workload changes
  const report: AnalysisReport = useMemo(() => {
    return analyzeMigration(sql, workload);
  }, [sql, workload]);

  // Dynamic Page Titles for SEO & Browser State
  useEffect(() => {
    const titles: Record<ActiveView, string> = {
      overview: 'Migration Safety Overview — MIGRATECHECK',
      editor: 'SQL Editor & Live Concurrency Analysis — MIGRATECHECK',
      findings: `Hazards & Concurrency Findings (${report.issues.length}) — MIGRATECHECK`,
      rules: 'Database Safety Rules Catalog — MIGRATECHECK',
      history: 'Migration Execution History & CI/CD Audits — MIGRATECHECK',
      reports: 'Migration Safety Audit Reports — MIGRATECHECK',
    };
    document.title = titles[activeView] || 'MIGRATECHECK — Database Migration Safety Analyzer';
  }, [activeView, report.issues.length]);

  // Cross-Platform Global Keyboard Shortcuts (Windows, macOS, Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+Enter or Cmd+Enter -> Run Analyze
      if (modifier && e.key === 'Enter') {
        e.preventDefault();
        handleManualAnalyze();
      }
      // Escape -> close mobile menu or any modal
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsConfigOpen(false);
        setIsRulesOpen(false);
        setIsSimulatorOpen(false);
        setIsExportOpen(false);
        setIsLoginOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sql, report]);

  const handleSelectSample = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    if (sampleId === 'custom') {
      showInfo('Custom Mode Active', 'SQL editor is cleared for your custom DDL statements.');
      return;
    }
    const found = SAMPLE_MIGRATIONS.find((s) => s.id === sampleId);
    if (found) {
      setSql(found.sql);
      setWorkload((prev) => ({
        ...prev,
        targetEngine: found.engine,
        estimatedRowCount: found.tableSize,
      }));
      showInfo('Preset Migration Loaded', found.title);
    }
  };

  const handleManualAnalyze = () => {
    if (!sql.trim()) {
      showWarning('Awaiting SQL Statements', 'Enter or paste SQL migration statements in the editor before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      if (report.issues.length === 0) {
        showSuccess('Analysis Complete: Safe!', 'All migration statements adhere to non-blocking concurrency standards.');
      } else {
        const crit = report.issues.filter((i) => i.severity === 'CRITICAL').length;
        showWarning('Analysis Complete', `Found ${report.issues.length} hazard(s) (${crit} Critical). Review Findings tab.`);
      }
    }, 280);
  };

  const handleSaveToDatabase = async () => {
    if (!sql.trim()) {
      showError('Cannot Save Empty Migration', 'Please enter SQL migration statements before saving to database audit trail.');
      return;
    }

    const nextNumber = migrationId !== 'Draft' ? migrationId : `#${Math.floor(1000 + Math.random() * 9000)}`;
    const success = await saveMigrationToDatabase({
      migrationNumber: nextNumber,
      title: selectedSampleId !== 'custom' 
        ? `${selectedSampleId}.sql`
        : 'custom_migration.sql',
      rawSql: sql,
      report,
      author: currentUser ? (currentUser.name || currentUser.email) : 'engineer',
    });

    if (success) {
      setIsSaved(true);
      showSuccess('Audit Record Saved', `Migration ${nextNumber} recorded into database audit trail.`);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      showError('Database Save Failed', 'PostgreSQL database connection is currently unavailable.');
    }
  };

  const handleTargetEngineChange = (engine: DatabaseEngine) => {
    setWorkload((prev) => ({ ...prev, targetEngine: engine }));
    showInfo('Target Engine Switched', `Safety rules calibrated for ${engine.toUpperCase()}`);
  };

  const criticalFindingsCount = report.issues.filter((i) => i.severity === 'CRITICAL').length;

  return (
    <div className="h-[100dvh] w-screen max-w-full bg-[#F6F7F9] text-[#20242A] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white overflow-hidden">
      
      {/* Workbench Layout: Fixed Sidebar + Main App Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        
        {/* Left Workbench Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            if (view === 'rules') {
              setIsRulesOpen(true);
            } else if (view === 'reports') {
              setIsExportOpen(true);
            } else {
              setActiveView(view);
            }
          }}
          targetEngine={workload.targetEngine}
          setTargetEngine={handleTargetEngineChange}
          issuesCount={report.issues.length}
          criticalCount={criticalFindingsCount}
          dbConnected={dbConnected}
          apiOnline={apiOnline}
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Right Application Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          {/* Top Status Header */}
          <StatusHeader
            report={report}
            workload={workload}
            migrationId={migrationId}
            isAnalyzing={isAnalyzing}
            onReAnalyze={handleManualAnalyze}
            onExport={() => setIsExportOpen(true)}
            onSaveToDb={handleSaveToDatabase}
            isSaved={isSaved}
            user={currentUser}
            onOpenLogin={() => setIsLoginOpen(true)}
            onLogout={() => {
              localStorage.removeItem('migratecheck_user');
              setCurrentUser(null);
              showInfo('Signed Out', 'Local user credentials cleared.');
            }}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onLogoClick={() => setActiveView('overview')}
          />

          {/* Analysis Pipeline Progress Line */}
          <AnalysisProgress isAnalyzing={isAnalyzing} />

          {/* Main Content Area: padded for mobile bottom nav on screens < md */}
          <main className="flex-1 p-3 sm:p-4 space-y-4 max-w-[1600px] w-full mx-auto overflow-y-auto overflow-x-hidden min-w-0 pb-20 md:pb-4">
            
            {/* VIEW 1: OVERVIEW (Main Technical Workbench) */}
            {activeView === 'overview' && (
              <div className="space-y-4">
                
                {/* Compact telemetry and concrete safety checks */}
                <ScoreOverviewCard report={report} />

                {/* 2-Column Responsive Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                  
                  {/* Left Column: SQL Editor & AST Statement Sequence (5 cols) */}
                  <div className="lg:col-span-5 min-w-0 flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#20242A] uppercase flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-[#2563EB]" />
                        SQL Under Analysis
                      </span>
                      <span className="text-[11px] font-mono text-[#6B7280]">
                        {workload.targetEngine.toUpperCase()} DDL
                      </span>
                    </div>

                    <SqlEditorPanel
                      sql={sql}
                      setSql={setSql}
                      targetEngine={workload.targetEngine}
                      onAnalyze={handleManualAnalyze}
                      isAnalyzing={isAnalyzing}
                      onSelectSample={handleSelectSample}
                      selectedSampleId={selectedSampleId}
                      issues={report.issues}
                      onSelectIssueLine={(line) => setSelectedLine(line)}
                    />

                    {/* Statement AST Sequence & Production Checklist */}
                    <StatementSummaryPanel 
                      report={report} 
                      onSelectStatement={(line) => setSelectedLine(line)}
                    />
                  </div>

                  {/* Right Column: Findings Table, Safe Rewrite & Lock Matrix (7 cols) */}
                  <div className="lg:col-span-7 min-w-0 flex flex-col space-y-3">
                    
                    {/* Sub-Tabs: Findings Table, Safe Alternative, Lock Matrix */}
                    <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-px">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        
                        <button
                          onClick={() => setActiveOverviewTab('findings')}
                          className={`h-8 px-3 rounded-t border-t border-l border-r transition-colors flex items-center gap-1.5 cursor-pointer ${
                            activeOverviewTab === 'findings'
                              ? 'bg-[#FFFFFF] border-[#D1D5DB] text-[#20242A] font-bold border-b-white'
                              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span>Findings</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            report.issues.length > 0 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#15803D]'
                          }`}>
                            {report.issues.length}
                          </span>
                        </button>

                        <button
                          onClick={() => setActiveOverviewTab('rewrite')}
                          className={`h-8 px-3 rounded-t border-t border-l border-r transition-colors flex items-center gap-1.5 cursor-pointer ${
                            activeOverviewTab === 'rewrite'
                              ? 'bg-[#FFFFFF] border-[#D1D5DB] text-[#20242A] font-bold border-b-white'
                              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
                          <span>Safe Rewrite</span>
                        </button>

                        <button
                          onClick={() => setActiveOverviewTab('matrix')}
                          className={`h-8 px-3 rounded-t border-t border-l border-r transition-colors flex items-center gap-1.5 cursor-pointer ${
                            activeOverviewTab === 'matrix'
                              ? 'bg-[#FFFFFF] border-[#D1D5DB] text-[#20242A] font-bold border-b-white'
                              : 'border-transparent text-[#4B5563] hover:text-[#111827]'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5 text-[#D97706]" />
                          <span>Lock Matrix</span>
                        </button>

                      </div>

                      <button
                        onClick={() => setIsSimulatorOpen(true)}
                        className="text-[11px] font-mono text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span>Run Lock Simulation →</span>
                      </button>
                    </div>

                    {/* Tab Views */}
                    {activeOverviewTab === 'findings' && (
                      <IssuesList 
                        issues={report.issues} 
                        selectedLine={selectedLine}
                        onSelectIssue={(issue) => setSelectedLine(issue.line)}
                        totalStatements={report.totalStatements}
                      />
                    )}

                    {activeOverviewTab === 'rewrite' && (
                      <SafeRewriteViewer report={report} />
                    )}

                    {activeOverviewTab === 'matrix' && (
                      <LockMatrixView report={report} />
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* VIEW 2: SQL EDITOR (Focused Editor View) */}
            {activeView === 'editor' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-[#20242A] uppercase">
                      SQL Editor & AST Risk Annotator
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      Review and edit migration DDL with live inline concurrency hazard markers
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveView('overview')}
                    className="text-xs font-mono text-[#2563EB] hover:underline cursor-pointer"
                  >
                    ← Back to Workbench Overview
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                  <div className="lg:col-span-7 xl:col-span-7 min-w-0 flex flex-col space-y-3">
                    <SqlEditorPanel
                      sql={sql}
                      setSql={setSql}
                      targetEngine={workload.targetEngine}
                      onAnalyze={handleManualAnalyze}
                      isAnalyzing={isAnalyzing}
                      onSelectSample={handleSelectSample}
                      selectedSampleId={selectedSampleId}
                      issues={report.issues}
                      onSelectIssueLine={(line) => setSelectedLine(line)}
                    />
                  </div>
                  <div className="lg:col-span-5 xl:col-span-5 min-w-0 flex flex-col space-y-3">
                    <StatementSummaryPanel 
                      report={report} 
                      onSelectStatement={(line) => setSelectedLine(line)}
                    />
                    <ScoreOverviewCard report={report} compact={true} />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: FINDINGS (Dedicated Full-Width Inspection View) */}
            {activeView === 'findings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-[#20242A] uppercase">
                      Detailed Concurrency & Lock Findings
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      Technical inspection table detailing lock tiers, queue blocking, and non-blocking replacements
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveView('overview')}
                    className="text-xs font-mono text-[#2563EB] hover:underline cursor-pointer"
                  >
                    ← Back to Workbench Overview
                  </button>
                </div>

                <IssuesList 
                  issues={report.issues} 
                  selectedLine={selectedLine}
                  onSelectIssue={(issue) => setSelectedLine(issue.line)}
                  totalStatements={report.totalStatements}
                />

                <SafeRewriteViewer report={report} />
              </div>
            )}

            {/* VIEW 4: HISTORY (Migration Audit History) */}
            {activeView === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-[#20242A] uppercase">
                      CI/CD Migration Audit Logs
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      Historical log of evaluated migrations and Pull Request checks
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveView('overview')}
                    className="text-xs font-mono text-[#2563EB] hover:underline cursor-pointer"
                  >
                    ← Back to Workbench Overview
                  </button>
                </div>

                <HistoryPanel onLoadMigration={(id: string) => {
                  setActiveView('overview');
                  showInfo('Audit Loaded', `Viewing migration audit record ${id}`);
                }} />
              </div>
            )}

            {/* VIEW 5: CUSTOM 404 / FALLBACK PAGE */}
            {!['overview', 'editor', 'findings', 'history', 'rules', 'reports'].includes(activeView) && (
              <NotFoundPage onNavigate={setActiveView} />
            )}

          </main>

          {/* Workbench Technical Footer: Hidden on mobile < md where MobileBottomNav is docked */}
          <footer className="hidden md:block border-t border-[#D1D5DB] bg-[#FFFFFF] py-2 px-4 text-[11px] font-mono text-[#6B7280] shrink-0 select-none pb-safe">
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#20242A]">MIGRATECHECK</span>
                <span className="text-[#D1D5DB]">•</span>
                <span>© {new Date().getFullYear()} MIGRATECHECK Systems</span>
                <span className="text-[#D1D5DB]">•</span>
                <a 
                  href="tel:+18005553227" 
                  className="text-[#2563EB] hover:underline flex items-center gap-1"
                  title="Call Emergency On-Call DBA Line"
                >
                  <Phone className="w-3 h-3" />
                  <span>+1 (800) 555-DBAS</span>
                </a>
                <span className="text-[#D1D5DB]">•</span>
                <a 
                  href="mailto:support@migratecheck.io?subject=Migration%20Inquiry" 
                  className="text-[#2563EB] hover:underline flex items-center gap-1"
                  title="Email DBA Engineering Team"
                >
                  <Mail className="w-3 h-3" />
                  <span>support@migratecheck.io</span>
                </a>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button 
                  onClick={() => setIsRulesOpen(true)} 
                  className="hover:text-[#2563EB] cursor-pointer transition-colors"
                >
                  Rules Catalog
                </button>
                <span className="text-[#D1D5DB]">•</span>
                <button 
                  onClick={() => setIsSimulatorOpen(true)} 
                  className="hover:text-[#2563EB] cursor-pointer transition-colors"
                >
                  Lock Simulator
                </button>
                <span className="text-[#D1D5DB]">•</span>
                <span className="text-[#15803D] font-bold">● Zero-Downtime Engine Active</span>
              </div>
            </div>
          </footer>

        </div>

      </div>

      {/* Native Mobile Bottom Navigation Bar (< md) */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={(view) => setActiveView(view)}
        issuesCount={report.issues.length}
        criticalCount={criticalFindingsCount}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Modals & Dialogs */}
      <WorkloadConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        workload={workload}
        setWorkload={setWorkload}
      />

      <DryRunSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        report={report}
      />

      <RulesExplorerModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        report={report}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          showSuccess('Signed In', `Welcome, ${u.name || u.email}!`);
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppWorkbench />
    </ToastProvider>
  );
}
