
import React, { useState } from 'react';
import { Layers, ArrowRight, Lock, Mail } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  validUsers?: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, validUsers }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock Authentication Delay
    setTimeout(() => {
        if (validUsers) {
            // Check against dynamic list from Admin Builder
            const foundUser = validUsers.find(u => u.email === email && u.password === password);
            if (foundUser) {
                onLogin(foundUser);
            } else {
                setError('Invalid credentials.');
                setIsLoading(false);
            }
        } else {
            // Fallback Legacy Mock Logic (if validUsers is not provided)
            if (email.endsWith('@university.edu') || email === 'demo@d-be.com') {
                if (password.length >= 6) {
                    onLogin({
                        id: `legacy-${Date.now()}`,
                        email: email,
                        name: email.split('@')[0],
                        avatar: `https://ui-avatars.com/api/?name=${email}&background=0D8ABC&color=fff`,
                        role: 'student'
                    });
                } else {
                    setError('Invalid credentials.');
                    setIsLoading(false);
                }
            } else if (email === 'admin@d-be.com') {
                if (password.length >= 6) {
                    onLogin({
                        id: 'admin-legacy',
                        email: email,
                        name: "Administrator",
                        avatar: `https://ui-avatars.com/api/?name=Admin&background=334155&color=fff`,
                        role: 'admin'
                    });
                } else {
                    setError('Invalid admin credentials.');
                    setIsLoading(false);
                }
            } else {
                setError('Access denied. Please use your university email.');
                setIsLoading(false);
            }
        }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      
      {/* Left Side - Brand & Aesthetic */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-20"
                alt="Architecture"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
        </div>

        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-fit mb-6">
                <Layers className="w-3 h-3" /> Semester 2025
            </div>
            <h1 className="text-6xl font-extrabold text-white mb-2 leading-tight">
                D-Be
            </h1>
            <h2 className="text-3xl font-light text-slate-300">
                Recurrent Program
            </h2>
        </div>

        <div className="relative z-10 max-w-md">
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
                "The Digital Built Environment is not just about tools, but the synthesis of information, geometry, and material performance."
            </p>
            <div className="flex gap-2">
                 <div className="w-12 h-1 bg-blue-500 rounded-full"></div>
                 <div className="w-2 h-1 bg-slate-700 rounded-full"></div>
                 <div className="w-2 h-1 bg-slate-700 rounded-full"></div>
            </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold text-white">Welcome back</h3>
                <p className="text-slate-500 mt-2">Sign in to access your module tutorials.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                            type="email" 
                            required
                            placeholder="student@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Verifying...' : 'Access Platform'}
                    {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
            </form>
            
            <p className="text-center text-sm text-slate-500">
                Contact your course administrator if you have trouble logging in.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
