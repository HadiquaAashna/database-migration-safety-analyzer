import React, { useState } from 'react';
import { DbRuleDefinition, RULES_CATALOG } from '../services/rulesCatalog';
import { X, Search, BookOpen, AlertOctagon, ShieldCheck } from 'lucide-react';

interface RulesExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesExplorerModal: React.FC<RulesExplorerModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRule, setSelectedRule] = useState<DbRuleDefinition>(RULES_CATALOG[0]);

  if (!isOpen) return null;

  const categories = ['ALL', 'Locking', 'Rewrites', 'Compatibility', 'Replication'];

  const filteredRules = RULES_CATALOG.filter((rule) => {
    const matchesCategory = selectedCategory === 'ALL' || rule.category === selectedCategory;
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Database Migration Safety Rulebook</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Zero-downtime rules & lock encyclopedia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Sidebar: Search & Rule List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50 max-h-48 md:max-h-none shrink-0">
            {/* Search Input */}
            <div className="p-2 sm:p-3 border-b border-slate-200 space-y-1.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search rules, locks, DDL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs font-medium"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer font-medium ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {filteredRules.map((rule) => {
                const isSelected = selectedRule.id === rule.id;
                return (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedRule(rule)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-l-4 border-blue-600 shadow-2xs font-semibold'
                        : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-blue-600">{rule.id}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {rule.category}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                      {rule.name}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {rule.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Selected Rule Deep Dive */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-white">
            {selectedRule && (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedRule.id}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedRule.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5">{selectedRule.name}</h3>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
                    {selectedRule.severity} SEVERITY
                  </span>
                </div>

                {/* Section 1: Storage Engine Mechanism */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Relational Storage Engine Mechanism & Theory
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {selectedRule.mechanism}
                  </p>
                </div>

                {/* Section 2: Outage Impact */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    Production Outage Impact
                  </h4>
                  <p className="text-xs text-rose-900 leading-relaxed bg-rose-50/70 p-4 rounded-xl border border-rose-200">
                    {selectedRule.dangerScenario}
                  </p>
                </div>

                {/* Section 3: Safe Pattern */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Zero-Downtime Safe Pattern
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedRule.safePattern}
                  </p>
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-xs overflow-x-auto">
                    <pre><code>{selectedRule.safeSqlExample}</code></pre>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
