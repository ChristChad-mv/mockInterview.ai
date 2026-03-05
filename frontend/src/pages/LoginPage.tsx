/**
 * MockInterview.ai — Login Page
 * Simple passcode gate for hackathon demo access.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Code2, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    const ok = await login(code.trim());
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Invalid access code');
      setCode('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/25 mb-5">
            <Code2 size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            MockInterview<span className="text-blue-400">.ai</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">Enter your access code to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white placeholder-gray-600 outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all font-mono text-lg tracking-widest"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Enter
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-gray-700">
          Access codes are provided to hackathon judges.
          <br />
          <a
            href="https://github.com/ChristChad-mv/mockInterview.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            View source on GitHub →
          </a>
        </p>
      </motion.div>
    </div>
  );
}
