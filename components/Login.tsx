
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Layers, ArrowRight, Lock, Mail, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';
import { TOPICS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
  validUsers?: User[];
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FIRST_TIME';

const Login: React.FC<LoginProps> = ({ onLogin, validUsers }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        if (authMode === 'FIRST_TIME') {
            // 1. Create Auth Account first so we are authenticated for the Firestore check
            let firebaseUser;
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
            } catch (authErr: any) {
                if (authErr.code === 'auth/email-already-in-use') {
                    setError('This email is already registered. Please sign in.');
                } else {
                    throw authErr;
                }
                setIsLoading(false);
                return;
            }

            // 2. Now check if email is pre-approved in Firestore
            const userDocRef = doc(db, 'users', email);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().status !== 'pending') {
                // Not allowed! Delete the auth user we just created to keep Auth clean
                await firebaseUser.delete();
                setError('This email is not pre-approved for registration. Please contact your administrator.');
                setIsLoading(false);
                return;
            }

            const pendingData = userDoc.data() as User;
            
            await updateProfile(firebaseUser, { displayName: pendingData.name });
            
            // 3. Create active user doc with UID as ID
            const activeUser: User = {
                ...pendingData,
                id: firebaseUser.uid,
                status: 'active'
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), activeUser);
            
            // 4. Delete the pending document (which used email as ID)
            await deleteDoc(userDocRef);
            
            onLogin(activeUser);
        } else if (authMode === 'SIGNUP') {
            // Standard signup is restricted by business logic, but we keep it for admins or specific cases if needed
            // For now, let's just say standard signup is not allowed if we want strict control
            setError('Standard registration is disabled. Please use "First Time Login" if you were invited.');
            setIsLoading(false);
            return;
        } else {
            // LOGIN
            await signInWithEmailAndPassword(auth, email, password);
            // App.tsx onAuthStateChanged will handle the rest
        }
    } catch (err: any) {
        console.error("Auth error", err);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            setError('Invalid email or password. Please check your credentials.');
        } else if (err.code === 'auth/wrong-password') {
            setError('Incorrect password.');
        } else if (err.code === 'auth/email-already-in-use') {
            setError('This email is already registered. Please sign in.');
        } else if (err.code === 'auth/weak-password') {
            setError('Password should be at least 6 characters.');
        } else {
            setError('Authentication failed. Please try again.');
        }
    } finally {
        setIsLoading(false);
    }
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
                <h3 className="text-2xl font-bold text-white">
                    {authMode === 'LOGIN' ? 'Welcome back' : 
                     authMode === 'FIRST_TIME' ? 'First Time Login' : 'Create an account'}
                </h3>
                <p className="text-slate-500 mt-2">
                    {authMode === 'LOGIN' ? 'Sign in to access your module tutorials.' : 
                     authMode === 'FIRST_TIME' ? 'Enter your invited email to set up your password.' : 
                     'Sign up to start your learning journey.'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
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
                    <label className="text-sm font-medium text-slate-300">
                        {authMode === 'FIRST_TIME' ? 'Set Password' : 'Password'}
                    </label>
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
                    {isLoading ? 'Verifying...' : 
                     (authMode === 'LOGIN' ? 'Access Platform' : 
                      authMode === 'FIRST_TIME' ? 'Activate Account' : 'Create Account')}
                    {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
            </form>
            
            <div className="flex flex-col gap-3 text-center">
                {authMode === 'LOGIN' ? (
                    <>
                        <button 
                            onClick={() => setAuthMode('FIRST_TIME')}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> Log in for the first time
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setAuthMode('LOGIN')}
                        className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Already have an account? Sign In
                    </button>
                )}
            </div>
            
            <p className="text-center text-sm text-slate-500">
                Contact your course administrator if you have trouble logging in.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
