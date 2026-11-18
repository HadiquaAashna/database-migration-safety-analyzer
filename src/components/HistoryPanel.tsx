import React, { useState, useEffect } from 'react';
import { DatabaseEngine } from '../types/analyzer';
import { 
  History, 
  FileCode2, 
  ArrowRight, 
  User, 
  RefreshCw,
  Database
} from 'lucide-react';
import { fetchMigrationsList, SavedMigrationItem } from '../services/api';

interface HistoryPanelProps {
  onLoadMigration?: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onLoadMigration }) => {
  const [migrations, setMigrations] = useState<SavedMigrationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFromDb, setIsFromDb] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const dbMigrations = await fetchMigrationsList();
    if (dbMigrations && dbMigrations.length > 0) {
      setMigrations(dbMigrations);
      setIsFromDb(true);
    } else {
      setMigrations([]);
      setIsFromDb(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]';
      case 'MEDIUM':
        return 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
      default:
        return 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#F9FAFB] border-b border-[#D1D5DB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#20242A] uppercase tracking-wide">
            Migration Execution History & CI/CD Audit Trail
          </span>
          {isFromDb ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
              PostgreSQL Sync
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB]">
              Database Audit Trail
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#6B7280]">
            Total: {migrations.length} runs
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="h-6 px-2 rounded border border-[#D1D5DB] bg-[#FFFFFF] hover:bg-[#F3F4F6] text-[#374151] text-[11px] font-mono flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#2563EB]' : 'text-[#6B7280]'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* History Table or Clean Empty State */}
      {migrations.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-[#FFFFFF]">
          <div className="w-10 h-10 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] mx-auto">
            <History className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-[#20242A]">No Migration History Recorded</div>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Saved migration audits will be recorded here when you evaluate schema changes and save them to the database.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-[#F3F4F6] border-b border-[#D1D5DB] text-[11px] text-[#4B5563] uppercase">
              <th className="py-2 px-3">Run ID</th>
              <th className="py-2 px-3">Migration File</th>
              <th className="py-2 px-3">Engine</th>
              <th className="py-2 px-3">Risk Verdict</th>
              <th className="py-2 px-3">Safety Score</th>
              <th className="py-2 px-3">Author / Commit</th>
              <th className="py-2 px-3">Analyzed Date</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-[12px]">
            {migrations.map((mig) => (
              <tr key={mig.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-2.5 px-3 font-bold text-[#2563EB]">
                  {mig.migration_number}
                </td>
                <td className="py-2.5 px-3 font-mono font-semibold text-[#20242A]">
                  <span className="flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-[#6B7280]" />
                    {mig.title}
                  </span>
                </td>
                <td className="py-2.5 px-3 uppercase text-[11px] text-[#4B5563]">
                  {mig.target_engine}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${getRiskBadge(mig.overall_risk)}`}>
                    {mig.overall_risk}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-bold text-[#20242A]">
                  {mig.safety_score} / 100
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{mig.author}</span>
                    <span className="text-[#D1D5DB]">@</span>
                    <span className="font-mono text-[#2563EB]">{mig.commit_hash}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#6B7280]">
                  {typeof mig.created_at === 'string' ? mig.created_at.slice(0, 19).replace('T', ' ') : ''}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => onLoadMigration && onLoadMigration(mig.id)}
                    className="h-6 px-2 rounded bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#2563EB] text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Audit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <div className="p-2.5 bg-[#F9FAFB] border-t border-[#D1D5DB] text-[11px] font-mono text-[#6B7280] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Storage: PostgreSQL table <code className="text-[#20242A]">migrations</code></span>
        </span>
        <span className="text-[#15803D] font-bold">● CI/CD Pipeline Synced</span>
      </div>

    </div>
  );
};
