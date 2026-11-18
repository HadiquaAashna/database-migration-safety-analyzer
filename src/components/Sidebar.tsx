import React from 'react';
import { 
  LayoutDashboard, 
  FileCode2, 
  ShieldAlert, 
  BookOpen, 
  History, 
  FileText,
  Database,
  Server,
  Sliders,
  PlayCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DatabaseEngine } from '../types/analyzer';

export type ActiveView = 'overview' | 'editor' | 'findings' | 'rules' | 'history' | 'reports';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  targetEngine: DatabaseEngine;
  setTargetEngine: (engine: DatabaseEngine) => void;
  issuesCount: number;
  criticalCount: number;
  dbConnected?: boolean;
  apiOnline?: boolean;
  onOpenConfig: () => void;
  onOpenSimulator: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  targetEngine,
  setTargetEngine,
  issuesCount,
  criticalCount,
  dbConnected = false,
  apiOnline = false,
  onOpenConfig,
  onOpenSimulator,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'overview' as ActiveView,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'editor' as ActiveView,
      label: 'SQL Editor',
      icon: FileCode2,
      badge: null,
    },
    {
      id: 'findings' as ActiveView,
      label: 'Findings',
      icon: ShieldAlert,
      badge: issuesCount > 0 ? issuesCount : null,
      badgeCritical: criticalCount > 0,
    },
    {
      id: 'rules' as ActiveView,
      label: 'Rules',
      icon: BookOpen,
      badge: '6',
    },
    {
      id: 'history' as ActiveView,
      label: 'History',
      icon: History,
      badge: null,
    },
    {
      id: 'reports' as ActiveView,
      label: 'Reports',
      icon: FileText,
      badge: null,
    },
  ];

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none overflow-y-auto">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-12 px-3 border-b border-[#D1D5DB] flex items-center justify-between bg-[#F9FAFB] shrink-0">
          <div 
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2 min-w-0 cursor-pointer group"
            title="Return to Migration Overview"
          >
            <div className="w-5 h-5 rounded bg-[#2563EB] group-hover:bg-[#1D4ED8] flex items-center justify-center text-white font-mono font-bold text-xs shrink-0 transition-colors shadow-xs">
              M
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-mono font-bold text-xs text-[#20242A] group-hover:text-[#2563EB] tracking-tight truncate transition-colors">
                  MIGRATECHECK
                </span>
                <span className="text-[9px] text-[#6B7280] font-sans -mt-0.5 truncate">
                  v2.4.0 • DBA Workbench
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1 rounded text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] cursor-pointer"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Database Engine Selector */}
        {!isCollapsed ? (
          <div className="p-2 border-b border-[#E5E7EB] bg-[#F6F7F9]">
            <div className="text-[10px] font-mono font-semibold uppercase text-[#6B7280] px-1 mb-1.5 flex items-center justify-between">
              <span>Target Engine</span>
              <span className="text-[9px] text-[#2563EB] font-bold">ACTIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-[#E5E7EB] p-0.5 rounded">
              <button
                onClick={() => setTargetEngine('postgres')}
                className={`h-7 px-1.5 rounded text-[11px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  targetEngine === 'postgres'
                    ? 'bg-white text-[#20242A] font-bold shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <Database className="w-3 h-3 text-[#2563EB]" />
                <span>Postgres</span>
              </button>
              <button
                onClick={() => setTargetEngine('mysql')}
                className={`h-7 px-1.5 rounded text-[11px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  targetEngine === 'mysql'
                    ? 'bg-white text-[#20242A] font-bold shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <Server className="w-3 h-3 text-[#D97706]" />
                <span>MySQL 8</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-1.5 border-b border-[#E5E7EB] flex flex-col items-center gap-1 bg-[#F6F7F9]">
            <button
              onClick={() => setTargetEngine(targetEngine === 'postgres' ? 'mysql' : 'postgres')}
              className="w-8 h-8 rounded flex items-center justify-center bg-white border border-[#D1D5DB] text-[#20242A] font-bold shadow-2xs"
              title={`Switch Engine (Current: ${targetEngine})`}
            >
              {targetEngine === 'postgres' ? (
                <Database className="w-4 h-4 text-[#2563EB]" />
              ) : (
                <Server className="w-4 h-4 text-[#D97706]" />
              )}
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="p-2 space-y-0.5">
          {!isCollapsed && (
            <div className="text-[10px] font-mono font-semibold uppercase text-[#6B7280] px-2 py-1">
              Workbench Navigation
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'} py-2 rounded text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-medium shadow-xs'
                    : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== null && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeCritical
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#E5E7EB] text-[#4B5563]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Engineering Tool Actions */}
        <div className={`px-2 pt-2 border-t border-[#E5E7EB] space-y-1`}>
          {!isCollapsed && (
            <div className="text-[10px] font-mono font-semibold uppercase text-[#6B7280] px-2 py-1">
              Simulation Tools
            </div>
          )}
          <button
            onClick={() => {
              onOpenSimulator();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-2.5'} py-2 rounded text-xs text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827] cursor-pointer`}
            title={isCollapsed ? 'Lock Simulator' : undefined}
          >
            <PlayCircle className="w-4 h-4 text-[#2563EB] shrink-0" />
            {!isCollapsed && <span>Lock Simulator</span>}
          </button>
          <button
            onClick={() => {
              onOpenConfig();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'gap-2 px-2.5'} py-2 rounded text-xs text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827] cursor-pointer`}
            title={isCollapsed ? 'Workload Tuning' : undefined}
          >
            <Sliders className="w-4 h-4 text-[#6B7280] shrink-0" />
            {!isCollapsed && <span>Workload Tuning</span>}
          </button>
        </div>
      </div>

      {/* Sidebar Footer telemetry & Support Links */}
      {!isCollapsed && (
        <div className="p-2.5 border-t border-[#D1D5DB] bg-[#F9FAFB] text-[11px] font-mono text-[#6B7280] space-y-1.5 shrink-0 pb-safe">
          <div className="flex items-center justify-between">
            <span>Context:</span>
            <span className="font-bold text-[#20242A] truncate">prod-us-east-1</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span>Lock Mode:</span>
            <span className="text-[#15803D] font-bold">DDL Strict</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span>API:</span>
            <span className={apiOnline ? "text-[#15803D] font-bold" : "text-[#9CA3AF] font-bold"}>
              {apiOnline ? "● Port 5000" : "○ Disconnected"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span>Database:</span>
            <span className={dbConnected ? "text-[#15803D] font-bold" : "text-[#D97706] font-bold"}>
              {dbConnected ? "● PostgreSQL" : "○ In-Memory"}
            </span>
          </div>

          {/* Clickable Support & Inquiries */}
          <div className="pt-2 border-t border-[#E5E7EB] space-y-1 font-sans text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Emergency Tel:</span>
              <a 
                href="tel:+18005553227" 
                className="font-mono text-[#2563EB] hover:underline"
                title="Call 24/7 DBA On-Call"
              >
                +1 (800) 555-DBAS
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Engineering:</span>
              <a 
                href="mailto:support@migratecheck.io?subject=Migration%20Safety%20Inquiry" 
                className="font-mono text-[#2563EB] hover:underline truncate max-w-[115px]"
                title="Email DBA Engineering Team"
              >
                support@migratecheck.io
              </a>
            </div>
            <div className="pt-1 text-[9px] text-[#9CA3AF] text-center border-t border-[#F3F4F6]">
              © {new Date().getFullYear()} MIGRATECHECK Systems Inc.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop / Laptop Sidebar (Hidden on mobile < md) */}
      <aside className={`hidden md:flex ${isCollapsed ? 'w-14' : 'w-56'} shrink-0 bg-[#FFFFFF] border-r border-[#D1D5DB] flex-col justify-between select-none h-full transition-all duration-200 z-10`}>
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-40 md:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Slide-Over Drawer (Visible when isOpenMobile is true) */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#D1D5DB] shadow-2xl transform transition-transform duration-250 ease-out md:hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
