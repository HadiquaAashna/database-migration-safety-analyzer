import React, { useState } from 'react';
import { X, Lock, Mail, Shield, CheckCircle2, User } from 'lucide-react';

export interface AuthUser {
  email: string;
  name: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      // Optional call to backend auth API if available
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      let userName = email.split('@')[0];
      if (res && res.ok) {
        const data = await res.json();
        if (data.user?.name) userName = data.user.name;
      }

      const user: AuthUser = { email: email.trim(), name: userName };
      localStorage.setItem('migratecheck_user', JSON.stringify(user));
      onLoginSuccess(user);
      onClose();
    } catch {
      const user: AuthUser = { email: email.trim(), name: email.split('@')[0] };
      localStorage.setItem('migratecheck_user', JSON.stringify(user));
      onLoginSuccess(user);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    const demoUser: AuthUser = {
      email: 'engineer@company.com',
      name: 'alex.chen',
    };
    localStorage.setItem('migratecheck_user', JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-2xs select-none">
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-lg w-full max-w-sm shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[#D1D5DB] bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#2563EB] flex items-center justify-center text-white font-mono font-bold text-xs">
              M
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-[#20242A] uppercase">
                Developer Sign In
              </h3>
              <p className="text-[10px] text-[#6B7280]">
                Optional: Identify author for saved migrations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs font-mono">
          {error && (
            <div className="p-2 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11px]">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase text-[#6B7280] font-bold block mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full h-8 pl-8 pr-2.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded text-xs text-[#20242A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#6B7280] font-bold block mb-1">
              Password / Access Token
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-8 pl-8 pr-2.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded text-xs text-[#20242A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-8 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <User className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </div>

          {/* Quick Demo Fill */}
          <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280]">Quick Test:</span>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="text-[#2563EB] hover:underline cursor-pointer font-bold"
            >
              1-Click Demo Sign In →
            </button>
          </div>
        </form>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[10px] font-mono text-[#6B7280] flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-[#15803D]" />
          <span>Analyzer is 100% accessible without sign-in.</span>
        </div>

      </div>
    </div>
  );
};
