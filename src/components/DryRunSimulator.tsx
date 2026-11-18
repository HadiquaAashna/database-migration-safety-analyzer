import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport } from '../types/analyzer';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Activity, 
  Clock, 
  Cpu
} from 'lucide-react';

interface DryRunSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  report: AnalysisReport;
}

export const DryRunSimulator: React.FC<DryRunSimulatorProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'unsafe' | 'safe'>('unsafe');
  const [currentSecond, setCurrentSecond] = useState(0);
  const [maxDuration] = useState(25);
  const [blockedQueriesCount, setBlockedQueriesCount] = useState(0);
  const [poolUtilization, setPoolUtilization] = useState(18);
  const [p99Latency, setP99Latency] = useState(14);
  const [http504Count, setHttp504Count] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState<{ time: string; msg: string; type: 'info' | 'warn' | 'err' | 'ok' }[]>([]);

  const timerRef = useRef<number | null>(null);

  const resetSim = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentSecond(0);
    setBlockedQueriesCount(0);
    setPoolUtilization(18);
    setP99Latency(14);
    setHttp504Count(0);
    setSimulationLogs([
      { time: '00:00', msg: `Simulation initialized with ${report.workload.peakQps.toLocaleString()} QPS traffic on ${report.workload.targetEngine.toUpperCase()}`, type: 'info' }
    ]);
  };

  useEffect(() => {
    if (isOpen) {
      resetSim();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setCurrentSecond((sec) => {
          if (sec >= maxDuration) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return maxDuration;
          }
          const nextSec = sec + 1;
          tickSimulation(nextSec, mode);
          return nextSec;
        });
      }, 700);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const tickSimulation = (sec: number, currentMode: 'unsafe' | 'safe') => {
    const formattedTime = `00:${sec < 10 ? '0' + sec : sec}`;

    if (currentMode === 'unsafe') {
      if (sec === 2) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[MIGRATION START] Executing DDL: ALTER TABLE ... AccessExclusiveLock requested`, type: 'warn' },
          ...prev,
        ]);
      } else if (sec >= 3 && sec <= 18) {
        const addedBlocked = Math.round(report.workload.peakQps * 0.4);
        setBlockedQueriesCount((prev) => prev + addedBlocked);
        setPoolUtilization((prev) => Math.min(100, prev + 12));
        setP99Latency((prev) => prev + 450);

        if (sec >= 6) {
          const newErrors = Math.round(report.workload.peakQps * 0.15);
          setHttp504Count((prev) => prev + newErrors);
          if (sec === 6) {
            setSimulationLogs((prev) => [
              { time: formattedTime, msg: `🚨 [LOCK QUEUE SATURATION] DB connection pool saturated (100%). Influx queries timing out!`, type: 'err' },
              ...prev,
            ]);
          }
        }
      } else if (sec === 19) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[MIGRATION COMMIT] DDL finished after 17s table lock. Draining queue...`, type: 'warn' },
          ...prev,
        ]);
      } else if (sec > 19) {
        setBlockedQueriesCount((prev) => Math.max(0, prev - 1200));
        setPoolUtilization((prev) => Math.max(25, prev - 20));
        setP99Latency((prev) => Math.max(18, prev - 800));
      }
    } else {
      if (sec === 2) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[PHASE 1 EXPAND] SET lock_timeout = 2000ms. Non-blocking DDL applied.`, type: 'ok' },
          ...prev,
        ]);
        setPoolUtilization(22);
        setP99Latency(16);
      } else if (sec === 6) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[CONCURRENT INDEX] CREATE INDEX CONCURRENTLY running in background (ShareUpdateExclusiveLock)`, type: 'info' },
          ...prev,
        ]);
        setP99Latency(19);
      } else if (sec === 12) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[BATCH BACKFILL] Backfilling 5,000-row chunks with 50ms sleep. Zero write contention.`, type: 'ok' },
          ...prev,
        ]);
        setPoolUtilization(26);
      } else if (sec === 18) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `[CONSTRAINT VALIDATE] VALIDATE CONSTRAINT completed without blocking SELECT queries.`, type: 'ok' },
          ...prev,
        ]);
      } else if (sec === 22) {
        setSimulationLogs((prev) => [
          { time: formattedTime, msg: `✅ [SUCCESS] Zero-downtime migration completed. 0 dropped requests.`, type: 'ok' },
          ...prev,
        ]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Live Concurrency & Lock Queue Simulator</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Simulating {report.workload.peakQps.toLocaleString()} QPS traffic on {report.workload.targetEngine.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          
          {/* Strategy Mode Toggle & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">Select Migration Execution Strategy:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMode('unsafe'); resetSim(); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    mode === 'unsafe'
                      ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-2xs font-bold'
                      : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unsafe Original SQL
                </button>
                <button
                  onClick={() => { setMode('safe'); resetSim(); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    mode === 'safe'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs font-bold'
                      : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  DBMigrateGuard Safe Recipe
                </button>
              </div>
            </div>

            {/* Run / Pause / Reset Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isRunning ? 'Pause Sim' : 'Start Simulation'}</span>
              </button>

              <button
                onClick={resetSim}
                className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="Reset simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Real-time Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Metric 1 */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Blocked Query Queue</span>
              <div className={`text-2xl font-bold ${blockedQueriesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {blockedQueriesCount.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500">Queued behind lock</p>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">DB Pool Saturation</span>
              <div className={`text-2xl font-bold ${poolUtilization >= 90 ? 'text-rose-600' : poolUtilization > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {poolUtilization}%
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${poolUtilization >= 90 ? 'bg-rose-600' : 'bg-emerald-600'}`}
                  style={{ width: `${poolUtilization}%` }}
                />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">P99 Response Latency</span>
              <div className={`text-2xl font-bold ${p99Latency > 1000 ? 'text-rose-600' : p99Latency > 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {p99Latency.toLocaleString()} ms
              </div>
              <p className="text-[10px] text-slate-500">Baseline ~14ms</p>
            </div>

            {/* Metric 4 */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">HTTP 504 Outages</span>
              <div className={`text-2xl font-bold ${http504Count > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                {http504Count.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500">Dropped transactions</p>
            </div>

          </div>

          {/* Live Simulation Terminal Logs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                Live PostgreSQL Lock Event Log
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Simulation Time: 00:{currentSecond < 10 ? '0' + currentSecond : currentSecond} / 00:{maxDuration}
              </span>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs h-48 overflow-y-auto space-y-2 text-slate-300">
              {simulationLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-slate-500 text-[11px] shrink-0 font-semibold">{log.time}</span>
                  <span
                    className={
                      log.type === 'err'
                        ? 'text-rose-400 font-semibold'
                        : log.type === 'warn'
                        ? 'text-amber-300'
                        : log.type === 'ok'
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }
                  >
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">
            Engine: {report.workload.targetEngine.toUpperCase()} · Workload: {(report.workload.estimatedRowCount / 1_000_000).toFixed(1)}M Rows
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Close Simulator
          </button>
        </div>

      </div>
    </div>
  );
};
