import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import { isRegistered, register, verifyLogin, getUsername } from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isRegistered()) {
      setMode('register');
    } else {
      setMode('login');
      setUsername(getUsername());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!username.trim() || !password) {
          throw new Error("Username and password required");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 4) {
          throw new Error("Password too short (min 4 chars)");
        }
        await register(username, password);
        onLogin();
      } else {
        const isValid = await verifyLogin(password);
        if (isValid) {
          onLogin();
        } else {
          throw new Error("Invalid password");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paper-50 dark:bg-cyber-900 transition-colors duration-300 relative overflow-hidden font-sans">
       {/* Background Effects */}
       <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20" 
           style={{ 
             backgroundImage: `radial-gradient(circle at center, rgb(var(--primary-500)) 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
       </div>
       
       <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 dark:bg-cyber-800/80 backdrop-blur-xl border border-paper-200 dark:border-cyber-700 shadow-2xl animate-fadeIn transform transition-all">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
              <Lock className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {mode === 'login' ? `Welcome Back, ${username}` : 'Create Account'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {mode === 'login' ? 'Enter your local password to continue.' : 'Set up a local secure login.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-cyber-900/50 border border-paper-200 dark:border-cyber-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    placeholder="Choose a username"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
               <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-cyber-900/50 border border-paper-200 dark:border-cyber-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    placeholder="Enter password"
                  />
               </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm</label>
               <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-cyber-900/50 border border-paper-200 dark:border-cyber-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    placeholder="Confirm password"
                  />
               </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-sm text-center font-medium border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : (mode === 'login' ? 'Unlock ZhangNote' : 'Create Account')}
              {!isLoading && <ArrowRight size={20} />}
            </button>
          </form>

          {mode === 'login' && (
             <div className="mt-6 text-center">
                <button 
                  onClick={() => { 
                      if(confirm("This will clear all local settings, files, and your account. Are you sure?")) {
                          localStorage.clear(); 
                          window.location.reload();
                      }
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Reset / Clear All Local Data
                </button>
             </div>
          )}
       </div>
    </div>
  );
};