import React from 'react';
import { WorkloadProfile } from '../types/analyzer';
import { X, Server, Gauge, Clock, ShieldAlert, Cpu } from 'lucide-react';

interface WorkloadConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workload: WorkloadProfile;
  setWorkload: React.Dispatch<React.SetStateAction<WorkloadProfile>>;
}

export const WorkloadConfigModal: React.FC<WorkloadConfigModalProps> = ({
  isOpen,
  onClose,
  workload,
  setWorkload,
}) => {
  if (!isOpen) return null;

  const presets = [
    { label: 'Small Development DB', rows: 50_000, qps: 50, timeout: 5000, env: 'internal-service' as const },
    { label: 'Medium Staging Cluster', rows: 1_000_000, qps: 300, timeout: 3000, env: 'staging' as const },
    { label: 'Production High-Volume OLTP', rows: 12_000_000, qps: 2500, timeout: 2000, env: 'production-critical' as const },
    { label: 'Tier-1 Enterprise (50M+ rows)', rows: 50_000_000, qps: 10000, timeout: 1000, env: 'production-critical' as const },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-2xs">
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-lg w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[#D1D5DB] bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#2563EB]" />
            <div>
              <h2 className="text-xs font-mono font-bold text-[#20242A] uppercase">
                Workload & Concurrency Profile
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                Configure target database volume and concurrency for lock duration calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 overflow-y-auto text-xs font-mono">
          
          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1.5">
              Profile Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setWorkload((prev) => ({
                      ...prev,
                      estimatedRowCount: p.rows,
                      peakQps: p.qps,
                      lockTimeoutMs: p.timeout,
                      environment: p.env,
                    }));
                  }}
                  className={`p-2 rounded text-left border transition-colors cursor-pointer text-xs ${
                    workload.estimatedRowCount === p.rows
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold'
                      : 'border-[#D1D5DB] bg-[#FFFFFF] text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-[10px] text-[#6B7280]">
                    {(p.rows / 1_000_000).toFixed(1)}M rows • {p.qps} QPS
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-3 space-y-3 font-sans">
            <div>
              <label className="text-xs font-semibold text-[#20242A] flex items-center justify-between">
                <span>Estimated Target Table Size (Rows)</span>
                <span className="font-mono text-[#2563EB] font-bold">
                  {workload.estimatedRowCount.toLocaleString()} rows
                </span>
              </label>
              <input
                type="range"
                min="10000"
                max="50000000"
                step="50000"
                value={workload.estimatedRowCount}
                onChange={(e) =>
                  setWorkload((prev) => ({
                    ...prev,
                    estimatedRowCount: Number(e.target.value),
                  }))
                }
                className="w-full mt-1.5 accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#20242A] flex items-center justify-between">
                <span>Peak Concurrency (Queries Per Second)</span>
                <span className="font-mono text-[#D97706] font-bold">
                  {workload.peakQps.toLocaleString()} QPS
                </span>
              </label>
              <input
                type="range"
                min="10"
                max="10000"
                step="50"
                value={workload.peakQps}
                onChange={(e) =>
                  setWorkload((prev) => ({
                    ...prev,
                    peakQps: Number(e.target.value),
                  }))
                }
                className="w-full mt-1.5 accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#20242A] flex items-center justify-between">
                <span>Lock Timeout Threshold (Milliseconds)</span>
                <span className="font-mono text-[#DC2626] font-bold">
                  {workload.lockTimeoutMs} ms
                </span>
              </label>
              <input
                type="range"
                min="200"
                max="10000"
                step="100"
                value={workload.lockTimeoutMs}
                onChange={(e) =>
                  setWorkload((prev) => ({
                    ...prev,
                    lockTimeoutMs: Number(e.target.value),
                  }))
                }
                className="w-full mt-1.5 accent-[#2563EB] cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#D1D5DB] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#2563EB] text-white font-mono text-xs font-semibold hover:bg-[#1D4ED8] cursor-pointer"
          >
            Apply Parameters
          </button>
        </div>

      </div>
    </div>
  );
};
