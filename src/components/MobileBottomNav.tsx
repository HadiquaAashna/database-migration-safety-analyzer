import React from 'react';
import { 
  LayoutDashboard, 
  FileCode2, 
  ShieldAlert, 
  History, 
  PlayCircle
} from 'lucide-react';
import { ActiveView } from './Sidebar';

interface MobileBottomNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  issuesCount: number;
  criticalCount: number;
  onOpenSimulator: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  issuesCount,
  criticalCount,
  onOpenSimulator,
}) => {
  const items = [
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
      id: 'history' as ActiveView,
      label: 'History',
      icon: History,
      badge: null,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-[#D1D5DB] z-30 pb-safe select-none shadow-lg">
      <div className="grid grid-cols-5 h-14 items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center h-full transition-colors relative cursor-pointer ${
                isActive ? 'text-[#2563EB] font-bold' : 'text-[#6B7280] hover:text-[#20242A]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'}`} />
                {item.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 font-mono text-[9px] min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center font-bold text-white ${
                      item.badgeCritical ? 'bg-[#DC2626]' : 'bg-[#2563EB]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-sans">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Live Simulation Quick Button */}
        <button
          onClick={onOpenSimulator}
          className="flex flex-col items-center justify-center h-full transition-colors text-[#6B7280] hover:text-[#2563EB] cursor-pointer"
        >
          <PlayCircle className="w-5 h-5 text-[#2563EB]" />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans text-[#2563EB] font-medium">
            Simulate
          </span>
        </button>
      </div>
    </nav>
  );
};
