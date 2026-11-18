import React from 'react';
import { AnalysisReport, LockMode } from '../types/analyzer';
import { Lock, CheckCircle2, XCircle, Info, ShieldAlert } from 'lucide-react';

interface LockMatrixViewProps {
  report: AnalysisReport;
}

export const LockMatrixView: React.FC<LockMatrixViewProps> = ({ report }) => {
  const { metrics, workload } = report;
  const highestLock = metrics.highestLockAcquired;
  const isPostgres = workload.targetEngine === 'postgres';

  const lockTiers: { name: LockMode; title: string; blocksReads: boolean; blocksWrites: boolean; ddlExamples: string }[] = isPostgres
    ? [
        {
          name: 'AccessExclusiveLock',
          title: 'AccessExclusiveLock (Level 8 — Maximum Lock)',
          blocksReads: true,
          blocksWrites: true,
          ddlExamples: 'ALTER TABLE ADD NOT NULL, DROP COLUMN, RENAME, TRUNCATE, VACUUM FULL',
        },
        {
          name: 'ShareLock',
          title: 'ShareLock (Level 5 — Blocks Writes)',
          blocksReads: false,
          blocksWrites: true,
          ddlExamples: 'CREATE INDEX (without CONCURRENTLY)',
        },
        {
          name: 'ShareUpdateExclusiveLock',
          title: 'ShareUpdateExclusiveLock (Level 4 — Safe Concurrency)',
          blocksReads: false,
          blocksWrites: false,
          ddlExamples: 'CREATE INDEX CONCURRENTLY, VACUUM (standard), ANALYZE',
        },
        {
          name: 'RowExclusiveLock',
          title: 'RowExclusiveLock (Level 3 — Standard DML)',
          blocksReads: false,
          blocksWrites: false,
          ddlExamples: 'UPDATE, DELETE, INSERT',
        },
      ]
    : [
        {
          name: 'MetadataLock_Exclusive',
          title: 'Exclusive Metadata Lock (MDL-X)',
          blocksReads: true,
          blocksWrites: true,
          ddlExamples: 'ALTER TABLE ALGORITHM=COPY, DROP COLUMN, RENAME',
        },
        {
          name: 'MetadataLock_Shared',
          title: 'Shared Metadata Lock (MDL-S)',
          blocksReads: false,
          blocksWrites: false,
          ddlExamples: 'ALTER TABLE ALGORITHM=INPLACE, LOCK=NONE',
        },
      ];

  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded divide-y divide-[#E5E7EB] min-w-0 shadow-xs">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#F9FAFB] flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#20242A] uppercase tracking-wide flex items-center gap-1.5 truncate">
            <Lock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span className="truncate">Lock Conflict Matrix ({workload.targetEngine.toUpperCase()})</span>
          </div>
          <div className="text-[11px] text-[#6B7280] truncate">
            Deterministic lock acquisition behavior under continuous OLTP queries
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#4B5563] shrink-0">
          Acquired Peak: <strong className="text-[#DC2626]">{highestLock}</strong>
        </div>
      </div>

      {/* Lock Hierarchy Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-[#F3F4F6] border-b border-[#D1D5DB] text-[11px] text-[#4B5563] uppercase">
              <th className="py-2 px-3">Lock Tier</th>
              <th className="py-2 px-3 text-center">Blocks SELECT</th>
              <th className="py-2 px-3 text-center">Blocks INSERT/UPDATE</th>
              <th className="py-2 px-3">DDL Operations Triggering</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {lockTiers.map((tier) => {
              const isAcquired = highestLock === tier.name;
              return (
                <tr 
                  key={tier.name}
                  className={`transition-colors ${isAcquired ? 'bg-[#FEF2F2]' : 'hover:bg-[#F9FAFB]'}`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-[#20242A]">{tier.name}</div>
                    <div className="text-[11px] text-[#6B7280] font-sans">{tier.title}</div>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {tier.blocksReads ? (
                      <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                        <XCircle className="w-3.5 h-3.5" /> BLOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#15803D]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {tier.blocksWrites ? (
                      <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                        <XCircle className="w-3.5 h-3.5" /> BLOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#15803D]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 font-sans text-xs text-[#4B5563]">
                    {tier.ddlExamples}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    {isAcquired ? (
                      <span className="px-2 py-0.5 rounded border border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] font-bold text-[10px]">
                        PEAK ACQUIRED
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF] text-[10px]">INACTIVE</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#F9FAFB] text-xs text-[#4B5563] space-y-1">
        <div className="font-bold text-[#20242A] flex items-center gap-1.5 font-mono text-[11px] uppercase">
          <Info className="w-3.5 h-3.5 text-[#2563EB]" />
          OLTP Lock Queue Hazard Analysis:
        </div>
        <p className="text-[11px] leading-relaxed text-[#4B5563]">
          In relational databases, when an <code className="bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#D1D5DB] text-[#DC2626]">{highestLock}</code> requests access, it queues behind active SELECT/UPDATE queries. While queued, it blocks all subsequent reads and writes, creating rapid thread exhaustion unless protected by a strict <code className="bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#D1D5DB] text-[#2563EB]">lock_timeout</code>.
        </p>
      </div>
    </div>
  );
};
