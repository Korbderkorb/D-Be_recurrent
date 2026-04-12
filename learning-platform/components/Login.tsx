
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Layers, ArrowRight, Lock, Mail, User as UserIcon, Sparkles } from 'lucide-react';
import { User, LandingConfig } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  validUsers?: User[];
  bootstrapAdminEmail: string;
  landingConfig: LandingConfig;
  theme: 'light' | 'dark';
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FIRST_TIME';

const Login: React.FC<LoginProps> = ({ onLogin, validUsers, bootstrapAdminEmail, landingConfig, theme }) => {
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
                    // Check if they have a pending record
                    const userDocRef = doc(db, 'users', email);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists() && userDoc.data().status === 'pending') {
                        setError('This email is already registered in our system. Please use the standard Login with your password to activate your account.');
                    } else {
                        setError('This email is already registered. Please sign in.');
                    }
                } else {
                    throw authErr;
                }
                setIsLoading(false);
                return;
            }

            // 2. Now check if email is pre-approved in Firestore
            const userDocRef = doc(db, 'users', email);
            const userDoc = await getDoc(userDocRef);

            const isBootstrapAdmin = email === bootstrapAdminEmail;

            if (!isBootstrapAdmin && (!userDoc.exists() || userDoc.data().status !== 'pending')) {
                // Not allowed! Delete the auth user we just created to keep Auth clean
                await firebaseUser.delete();
                setError('This email is not pre-approved for registration. Please contact your administrator.');
                setIsLoading(false);
                return;
            }

            const pendingData = userDoc.exists() ? (userDoc.data() as User) : {
                id: firebaseUser.uid,
                email: email,
                name: 'Admin',
                avatar: `https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff`,
                role: 'admin',
                status: 'active',
                allowedTopics: [],
                stats: { modulesCompleted: 0, totalModules: 0, lastActive: 'Just now', quizScores: [] }
            } as User;
            
            await updateProfile(firebaseUser, { displayName: pendingData.name });
            
            // 3. Create active user doc with UID as ID
            const activeUser: User = {
                ...pendingData,
                id: firebaseUser.uid,
                status: 'active'
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), activeUser);
            
            // 4. Delete the pending document if it exists (which used email as ID)
            if (userDoc.exists()) {
                await deleteDoc(userDocRef);
            }
            
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

    const getThemeImage = (lightUrl?: string, darkUrl?: string, defaultUrl?: string) => {
        if (theme === 'light' && lightUrl) return lightUrl;
        if (theme === 'dark' && darkUrl) return darkUrl;
        return defaultUrl || '';
    };

    return (
    <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Left Side - Brand & Aesthetic */}
      <div className={`hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        <div className="absolute inset-0 z-0">
             <img 
                src={getThemeImage(landingConfig.loginImageUrlLight, landingConfig.loginImageUrlDark, landingConfig.loginImageUrl) || undefined} 
                className={`w-full h-full object-cover ${theme === 'dark' ? 'opacity-20' : 'opacity-10'}`}
                alt="Architecture"
             />
             <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-slate-950 via-slate-950/50' : 'from-slate-100 via-slate-100/50'} to-transparent`}></div>
        </div>

        <div className="relative z-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider w-fit mb-6 ${
                theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
                <Layers className="w-3 h-3" /> {landingConfig.tag}
            </div>
            <h1 className={`text-6xl font-extrabold mb-2 leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {landingConfig.title}
            </h1>
            <h2 className={`text-3xl font-light ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {landingConfig.subtitle}
            </h2>
        </div>

        <div className="relative z-10 max-w-md">
            <p className={`text-lg leading-relaxed mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                "{landingConfig.quote}"
            </p>
            <div className="flex gap-2">
                 <div className="w-12 h-1 bg-blue-500 rounded-full"></div>
                 <div className={`w-2 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                 <div className={`w-2 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
            </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {authMode === 'LOGIN' ? (landingConfig.loginTitle || 'Welcome back') : 
                     authMode === 'FIRST_TIME' ? (landingConfig.firstTimeLoginTitle || 'First Time Login') : 'Create an account'}
                </h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {authMode === 'LOGIN' ? (landingConfig.loginSubtitle || 'Sign in to access your module tutorials.') : 
                     authMode === 'FIRST_TIME' ? (landingConfig.firstTimeLoginSubtitle || 'Enter your invited email to set up your password.') : 
                     'Sign up to start your learning journey.'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-2">
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                            type="email" 
                            required
                            placeholder="student@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full border rounded-xl py-3 pl-10 pr-4 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                            className={`w-full border rounded-xl py-3 pl-10 pr-4 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
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
                        className={`text-sm font-medium transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Already have an account? Sign In
                    </button>
                )}
            </div>
            
            <p className={`text-center text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Contact your course administrator if you have trouble logging in.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
