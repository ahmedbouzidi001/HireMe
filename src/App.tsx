import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  Target, 
  Loader2, 
  Plus, 
  FileText, 
  Search, 
  LogOut, 
  Settings,
  Download, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Briefcase, 
  User as UserIcon, 
  MapPin,
  Sparkles,
  TrendingUp,
  History,
  ExternalLink,
  DownloadCloud,
  Rocket,
  ShieldCheck,
  Zap,
  Globe,
  Mail,
  Phone,
  Edit3,
  Building2,
  GraduationCap,
  Cpu,
  Award,
  Check,
  Users,
  Star,
  CreditCard,
  ArrowRight,
  Play,
  Layout,
  Layers,
  Shield,
  Clock,
  Quote,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import { auth, db, googleProvider, appleProvider } from './lib/firebase';
import { cn } from './lib/utils';
import { Language, translations } from './translations';
import { CVBuilder } from './components/CVBuilder';
import { PremiumPage } from './components/PremiumPage';
import { 
  analyzeProfile, 
  searchJobs, 
  scoreJobMatch, 
  generateTargetedDocument, 
  getCareerCoachReport,
  generateLinkedInOptimization,
  UserProfile,
  JobOffer,
  ATSResult
} from './lib/gemini';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

// --- AuthModal Component ---
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

function AuthModal({ isOpen, onClose, t }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const getErrorMessage = (err: any) => {
    const code = err?.code || '';
    const message = err?.message || '';
    
    if (code === 'auth/popup-closed-by-user') {
      return t('auth.popup_closed') || 'Authentification annulée';
    }
    if (code === 'auth/popup-blocked') {
      return t('auth.popup_blocked') || 'Pop-up bloquée. Vérifiez les paramètres de votre navigateur';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return t('auth.account_exists') || 'Ce compte existe déjà avec une autre méthode';
    }
    if (code === 'auth/user-cancelled') {
      return t('auth.user_cancelled') || 'Authentification annulée';
    }
    if (message.includes('CORS')) {
      return t('auth.cors_error') || 'Erreur de configuration. Veuillez contacter le support';
    }
    return message || t('auth.error_generic') || 'Erreur lors de l\'authentification';
  };

  const handleGoogle = async () => {
    setLoadingProvider('google');
    setError('');
    try {
      googleProvider.setCustomParameters({ 'prompt': 'select_account' });
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error('[v0] Google auth error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    setLoadingProvider('apple');
    setError('');
    try {
      appleProvider.addScopes(['email', 'name']);
      await signInWithPopup(auth, appleProvider);
      onClose();
    } catch (err: any) {
      console.error('[v0] Apple auth error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated/30 rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-border-subtle/40 backdrop-blur-3xl"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">
                  {isSignUp ? t('auth.signup_title') || 'Créer un compte' : t('auth.login_title') || 'Connexion'}
                </h2>
                <p className="text-slate-400 text-sm">{isSignUp ? t('auth.signup_desc') || 'Rejoignez HireMe.ai' : t('auth.login_desc') || 'Accédez à votre profil'}</p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-900/20 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={handleGoogle} 
                  disabled={loadingProvider !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 disabled:opacity-50 rounded-xl transition-all duration-200 text-white font-semibold group"
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  )}
                  <span>Google</span>
                </button>

                <button 
                  onClick={handleApple} 
                  disabled={loadingProvider !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 disabled:opacity-50 rounded-xl transition-all duration-200 text-white font-semibold group"
                >
                  {loadingProvider === 'apple' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/></svg>
                  )}
                  <span>Apple</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated/30 text-slate-400 font-medium uppercase tracking-wider">{t('auth.or_email') || 'Ou avec email'}</span></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-brand-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-colors"
                    placeholder={t('auth.email_placeholder') || 'votre@email.com'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Mot de passe</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-brand-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loadingProvider !== null || !email || !password}
                  className="w-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-primary/30 disabled:opacity-50 transition-all duration-200 uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? t('auth.signup_btn') || "S'inscrire" : t('auth.login_btn') || 'Se connecter'}
                </button>
              </form>

              {/* Toggle */}
              <div className="text-center text-sm text-slate-400">
                {isSignUp ? t('auth.have_account') || 'Déjà un compte ?' : t('auth.no_account') || "Pas encore de compte ?"}
                <button 
                  type="button" 
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="ml-2 text-brand-secondary hover:text-brand-primary font-semibold transition-colors"
                >
                  {isSignUp ? t('auth.login_link') || 'Se connecter' : t('auth.signup_link') || "S'inscrire"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [session, setSession] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('fr');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'applications' | 'coach' | 'profile' | 'settings' | 'recruiter' | 'linkedin' | 'cv-builder' | 'premium'>('dashboard');

  const t = (path: string) => {
    const keys = path.split('.');
    let current: any = translations[language];
    for (const key of keys) {
      if (current[key] === undefined) return path;
      current = current[key];
    }
    return current;
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      setIsAuthReady(true);
      if (!user) setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session) return;

    const path = `profiles/${session.uid}`;
    const unsubscribe = onSnapshot(doc(db, path), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile & { language?: Language };
        setProfile(data);
        if (data.language) setLanguage(data.language);
        setIsOnboarded(true);
        
        // Set default tab based on role
        if (data.role_type === 'recruiter' && activeTab === 'dashboard') {
          setActiveTab('recruiter');
        }
      } else {
        setIsOnboarded(false);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [session]);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-border-muted border-t-brand-primary rounded-full"
        />
      </div>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <LandingPage onLogin={() => setShowAuthModal(true)} loading={authLoading} t={t} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} t={t} />
      </ErrorBoundary>
    );
  }

  if (!isOnboarded) {
    return (
      <ErrorBoundary>
        <Onboarding session={session} onComplete={() => setIsOnboarded(true)} t={t} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-dark flex flex-col md:flex-row relative overflow-hidden">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-brand-secondary/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/5 to-transparent h-[200%] animate-scanline pointer-events-none mix-blend-overlay" />
        </div>

        <nav className="w-full md:w-64 bg-bg-card/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-border-muted p-4 flex flex-col relative z-10">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-slate-900 dark:text-white">
              <Target size={18} />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">HireMe.ai</span>
          </div>

          <div className="flex-1 space-y-2">
            {profile?.role_type !== 'recruiter' && (
              <>
                <NavButton 
                  active={activeTab === 'dashboard'} 
                  onClick={() => setActiveTab('dashboard')}
                  icon={<TrendingUp size={20} />}
                  label={t('common.dashboard')}
                />
                <NavButton 
                  active={activeTab === 'jobs'} 
                  onClick={() => setActiveTab('jobs')}
                  icon={<Search size={20} />}
                  label={t('common.jobs')}
                />
                <NavButton 
                  active={activeTab === 'applications'} 
                  onClick={() => setActiveTab('applications')}
                  icon={<History size={20} />}
                  label={t('common.applications')}
                />
                <NavButton 
                  active={activeTab === 'coach'} 
                  onClick={() => setActiveTab('coach')}
                  icon={<Sparkles size={20} />}
                  label={t('common.coach')}
                />
                <NavButton 
                  active={activeTab === 'cv-builder'} 
                  onClick={() => setActiveTab('cv-builder')}
                  icon={<FileText size={20} />}
                  label={'CV Builder'}
                />
                <NavButton 
                  active={activeTab === 'linkedin'} 
                  onClick={() => setActiveTab('linkedin')}
                  icon={<Globe size={20} />}
                  label={t('common.linkedin')}
                />
              </>
            )}
            
            {profile?.role_type === 'recruiter' && (
              <NavButton 
                active={activeTab === 'recruiter'} 
                onClick={() => setActiveTab('recruiter')}
                icon={<Briefcase size={20} />}
                label={t('common.recruiter')}
              />
            )}

            <NavButton 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={<UserIcon size={20} />}
              label={t('common.profile')}
            />
            <NavButton 
              active={activeTab === 'premium'} 
              onClick={() => setActiveTab('premium')}
              icon={<CreditCard size={20} />}
              label={'Premium'}
            />
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Settings size={20} />}
              label={t('common.settings')}
            />
          </div>

          <div className="pt-4 border-t border-border-muted space-y-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard profile={profile!} t={t} />}
            {activeTab === 'jobs' && <JobSearch profile={profile!} t={t} />}
            {activeTab === 'applications' && <Applications session={session} t={t} />}
            {activeTab === 'coach' && <Coach profile={profile!} t={t} />}
            {activeTab === 'linkedin' && <LinkedInOptimization profile={profile!} t={t} />}
            {activeTab === 'cv-builder' && <CVBuilder profile={profile!} t={t} />}
            {activeTab === 'premium' && <PremiumPage t={t} />}
            {activeTab === 'profile' && <ProfilePage profile={profile!} t={t} />}
            {activeTab === 'settings' && <SettingsPage profile={profile!} language={language} setLanguage={setLanguage} t={t} />}
            {activeTab === 'recruiter' && <RecruiterPage t={t} />}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium",
        active 
          ? "bg-brand-primary/10 text-brand-primary shadow-sm" 
          : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:bg-slate-800/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AuthModal({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: (p: string) => string }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const getErrorMessage = (err: any) => {
    const code = err?.code || '';
    const message = err?.message || '';
    
    if (code === 'auth/popup-closed-by-user') {
      return t('auth.popup_closed') || 'Authentification annulée';
    }
    if (code === 'auth/popup-blocked') {
      return t('auth.popup_blocked') || 'Pop-up bloquée. Vérifiez les paramètres de votre navigateur';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return t('auth.account_exists') || 'Ce compte existe déjà avec une autre méthode';
    }
    if (code === 'auth/user-cancelled') {
      return t('auth.user_cancelled') || 'Authentification annulée';
    }
    if (message.includes('CORS')) {
      return t('auth.cors_error') || 'Erreur de configuration. Veuillez contacter le support';
    }
    return message || t('auth.error_generic') || 'Erreur lors de l\'authentification';
  };

  const handleGoogle = async () => {
    setLoadingProvider('google');
    setError('');
    try {
      googleProvider.setCustomParameters({ 'prompt': 'select_account' });
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error('[v0] Google auth error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    setLoadingProvider('apple');
    setError('');
    try {
      appleProvider.addScopes(['email', 'name']);
      await signInWithPopup(auth, appleProvider);
      onClose();
    } catch (err: any) {
      console.error('[v0] Apple auth error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  }; const handleEmailAuth = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError(''); try { if (isSignUp) { await createUserWithEmailAndPassword(auth, email, password); } else { await signInWithEmailAndPassword(auth, email, password); } onClose(); } catch (err: any) { setError(err.message); } finally { setLoading(false); } }; return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"> <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-slate-200 dark:border-slate-800"> <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"> <LogOut className="w-5 h-5" /> </button> <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center"> {isSignUp ? t('landing.signup') || 'Créer un compte' : t('landing.login') || 'Connexion'} </h2> {error && ( <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2"> <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span> </div> )} <div className="space-y-3 mb-6"> <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 font-medium"> <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> Continuer avec Google </button> <button onClick={handleApple} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 font-medium"> <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/></svg> Continuer avec Apple </button> </div>               {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated/30 text-slate-400 font-medium uppercase tracking-wider">{t('auth.or_email') || 'Ou avec email'}</span></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-brand-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-colors"
                    placeholder={t('auth.email_placeholder') || 'votre@email.com'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Mot de passe</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-brand-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loadingProvider !== null || !email || !password}
                  className="w-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-brand-primary/30 disabled:opacity-50 transition-all duration-200 uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  {loadingProvider === null && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? t('auth.signup_btn') || "S'inscrire" : t('auth.login_btn') || 'Se connecter'}
                </button>
              </form>

              {/* Toggle */}
              <div className="text-center text-sm text-slate-400">
                {isSignUp ? t('auth.have_account') || 'Déjà un compte ?' : t('auth.no_account') || "Pas encore de compte ?"}
                <button 
                  type="button" 
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="ml-2 text-brand-secondary hover:text-brand-primary font-semibold transition-colors"
                >
                  {isSignUp ? t('auth.login_link') || 'Se connecter' : t('auth.signup_link') || "S'inscrire"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ); }

function LandingPage({ onLogin, loading, t }: { onLogin: () => void, loading: boolean, t: (p: string) => string }) {
  return (
    <div className="min-h-screen bg-bg-dark text-slate-900 dark:text-white overflow-x-hidden relative">
      {/* Futuristic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-secondary/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]" />
        
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Scanline */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/5 to-transparent h-[200%] animate-scanline pointer-events-none mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Target size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter">HireMe.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.features')}</a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.how_it_works')}</a>
            <a href="#pricing" className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t('landing.pricing')}</a>
          </div>
          <button onClick={onLogin} className="btn-secondary px-6 py-2 text-sm">{t('landing.login')}</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 relative z-10">
        <section className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-widest">
                <Sparkles size={14} className="animate-pulse" />
                <span>{t('landing.hero_badge')}</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
                {t('landing.hero_title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[length:200%_auto] animate-gradient">{t('landing.hero_title_highlight')}</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg font-medium">
                {t('landing.hero_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={onLogin} disabled={loading} className="btn-primary text-lg px-10 py-5 flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/40">
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      {t('landing.cta_start')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                <div className="flex items-center gap-4 px-4">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <img 
                        key={i} 
                        src={`https://picsum.photos/seed/user${i}/100/100`} 
                        className="w-10 h-10 rounded-full border-4 border-bg-dark bg-slate-100 dark:bg-slate-800 object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-yellow-500 text-yellow-500" />)}
                    </div>
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('landing.active_candidates')}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-10 bg-brand-primary/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative glass-card border-slate-200 dark:border-white/10 p-4 overflow-hidden shadow-[0_0_50px_-12px_rgba(108,99,255,0.3)]">
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl aspect-[4/3] flex flex-col p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.profile_analysis')}</p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">{t('landing.analyzing')}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-brand-secondary/20 text-brand-secondary text-[10px] font-black uppercase">
                      98% Match
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{t('landing.skills')}</p>
                        <div className="flex flex-wrap gap-1">
                          <div className="w-8 h-1.5 bg-brand-primary rounded-full" />
                          <div className="w-12 h-1.5 bg-brand-secondary rounded-full" />
                          <div className="w-6 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{t('landing.experience')}</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">8.5 {t('profile.exp_years')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Sparkles className="text-brand-primary w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{t('landing.feature_hawk_title')}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('landing.analyzing')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">HireMe <span className="text-brand-primary">Elite</span>.</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">{t('landing.footer_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title={t('landing.feature_ats_title')}
              desc={t('landing.feature_ats_desc')}
            />
            <FeatureCard 
              icon={<Target className="text-brand-primary" />}
              title={t('landing.feature_optimize_title')}
              desc={t('landing.feature_optimize_desc')}
            />
            <FeatureCard 
              icon={<FileText className="text-brand-secondary" />}
              title={t('common.applications')}
              desc={t('applications.subtitle')}
            />
            <FeatureCard 
              icon={<Globe className="text-blue-500" />}
              title={t('common.jobs')}
              desc={t('jobs.searching')}
            />
            <FeatureCard 
              icon={<Sparkles className="text-purple-500" />}
              title={t('landing.feature_coach_title')}
              desc={t('landing.feature_coach_desc')}
            />
            <FeatureCard 
              icon={<Rocket className="text-orange-500" />}
              title={t('landing.feature_hawk_title')}
              desc={t('landing.feature_hawk_desc')}
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 mt-40">
          <div className="glass-card p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full -mr-48 -mt-48 blur-[100px]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">{t('landing.how_it_works_title')}</h2>
                <div className="space-y-6">
                  <Step number="01" title={t('landing.step1_title')} desc={t('landing.step1_desc')} />
                  <Step number="02" title={t('landing.step2_title')} desc={t('landing.step2_desc')} />
                  <Step number="03" title={t('landing.step3_title')} desc={t('landing.step3_desc')} />
                </div>
              </div>
              <div className="relative aspect-square rounded-3xl bg-white dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-white/5 shadow-2xl">
                <img src="https://picsum.photos/seed/workflow/800/800" className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-brand-primary flex items-center justify-center text-slate-900 dark:text-white shadow-2xl shadow-brand-primary/50 cursor-pointer hover:scale-110 transition-transform">
                    <Play size={32} className="ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">{t('landing.pricing_title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">{t('landing.pricing_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
              title={t('landing.plan_free')} 
              price="0" 
              features={["Analyse de CV (3/mois)", "Recherche d'offres limitée", "Score ATS basique"]} 
            />
            <PricingCard 
              title={t('landing.plan_pro')} 
              price="19" 
              popular 
              features={["Analyse de CV illimitée", "Génération de documents (10/mois)", "Score ATS détaillé", "Coach AI basique"]} 
            />
            <PricingCard 
              title={t('landing.plan_elite')} 
              price="49" 
              features={["Tout du plan Pro", "Génération illimitée", "IA Hawk Automation", "Coach AI Premium", "Support prioritaire"]} 
            />
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-7xl mx-auto px-6 mt-40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Testimonial 
              name="Sarah L." 
              role="Product Designer" 
              text="Grâce à HireMe, j'ai décroché 3 entretiens en une semaine. L'optimisation ATS est magique !" 
            />
            <Testimonial 
              name="Karim B." 
              role="Ingénieur Cloud" 
              text="Le coach AI m'a aidé à identifier mes lacunes techniques. J'ai doublé mon salaire en 3 mois." 
            />
            <Testimonial 
              name="Elena M." 
              role="Marketing Manager" 
              text="L'interface est sublime et très intuitive. C'est l'outil indispensable pour tout chercheur d'emploi." 
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
                <Target size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter">HireMe.ai</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.footer_desc')}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">{t('landing.product')}</h4>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t('landing.features')}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t('landing.pricing')}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t('common.coach')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">Entreprise</h4>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-brand-primary transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">Carrières</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">Légal</h4>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-brand-primary transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">Conditions</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/5 pt-10">
          <p className="text-xs text-slate-600 dark:text-slate-400">© 2026 HireMe.ai. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Globe size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Français (FR)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="text-4xl font-black text-slate-800 dark:text-slate-200 group-hover:text-brand-primary transition-colors leading-none">{number}</div>
      <div className="space-y-1">
        <h4 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PricingCard({ title, price, features, popular }: { title: string, price: string, features: string[], popular?: boolean }) {
  return (
    <div className={cn(
      "glass-card p-8 flex flex-col space-y-8 relative",
      popular && "border-brand-primary shadow-[0_0_40px_-12px_rgba(108,99,255,0.3)] scale-105 z-10"
    )}>
      {popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-primary text-slate-900 dark:text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">Plus Populaire</div>}
      <div className="space-y-2">
        <h4 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-slate-900 dark:text-white">{price}€</span>
          <span className="text-slate-600 dark:text-slate-400 text-sm">/mois</span>
        </div>
      </div>
      <ul className="space-y-4 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Check size={16} className="text-brand-secondary shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button className={cn("w-full py-4 rounded-xl font-bold transition-all", popular ? "btn-primary" : "btn-secondary")}>Choisir ce plan</button>
    </div>
  );
}

function Testimonial({ name, role, text }: { name: string, role: string, text: string }) {
  return (
    <div className="glass-card space-y-6">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-brand-secondary text-brand-secondary" />)}
      </div>
      <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">"{text}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">{role}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card space-y-4 hover:border-slate-300 dark:border-white/20 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Onboarding({ session, onComplete, t }: { session: User, onComplete: () => void, t: (p: string) => string }) {
  const [mode, setMode] = useState<'role' | 'choice' | 'import' | 'form' | 'recruiter_form'>('role');
  const [roleType, setRoleType] = useState<'candidate' | 'recruiter' | null>(null);
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    console.log("Starting PDF extraction for:", file.name);
    const arrayBuffer = await file.arrayBuffer();
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log("PDF loaded, pages:", pdf.numPages);
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      console.log("Extraction complete, text length:", fullText.length);
      if (fullText.trim().length < 50) {
        throw new Error(t('onboarding.error_pdf_short'));
      }
      return fullText;
    } catch (err) {
      console.error("PDF.js error:", err);
      throw err;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      await handleProcessCV(text);
    } catch (error) {
      console.error("PDF extraction error:", error);
      alert(t('onboarding.error_pdf_read'));
      setMode('import');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessCV = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const analyzedProfile = await analyzeProfile(text);
      const path = `profiles/${session.uid}`;
      await setDoc(doc(db, path), {
        ...analyzedProfile,
        user_id: session.uid,
        email: session.email,
        updated_at: Timestamp.now()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `profiles/${session.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || uploading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {uploading ? t('onboarding.reading_pdf') : t('onboarding.analyzing')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">{t('onboarding.analyzing_desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full glass-card space-y-8"
      >
        {mode === 'role' && (
          <div className="text-center space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Bienvenue sur HireMe.ai</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Pour commencer, dites-nous qui vous êtes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => {
                  setRoleType('candidate');
                  setMode('choice');
                }}
                className="p-8 rounded-2xl border border-border-muted bg-slate-100/80 dark:bg-slate-800/50 hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left space-y-4 group"
              >
                <div className="w-16 h-16 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                  <UserIcon size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Je suis un Candidat</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Je cherche à optimiser mon CV, trouver des offres et décrocher des entretiens grâce à l'IA.</p>
                </div>
              </button>
              <button 
                onClick={() => {
                  setRoleType('recruiter');
                  setMode('recruiter_form');
                }}
                className="p-8 rounded-2xl border border-border-muted bg-slate-100/80 dark:bg-slate-800/50 hover:border-brand-secondary hover:bg-brand-secondary/5 transition-all text-left space-y-4 group"
              >
                <div className="w-16 h-16 rounded-xl bg-brand-secondary/20 flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform">
                  <Briefcase size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Je suis un Recruteur</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Je cherche à publier des offres et trouver les meilleurs talents avec le matching IA.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === 'choice' && (
          <div className="text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white">{t('onboarding.title') || 'Commençons'}</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">{t('onboarding.subtitle') || 'Comment souhaitez-vous créer votre profil?'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload PDF */}
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="p-8 h-full rounded-2xl border-2 border-dashed border-border-subtle bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 group-hover:border-brand-primary group-hover:bg-brand-primary/20 transition-all text-center space-y-4 group">
                  <div className="w-16 h-16 rounded-xl bg-brand-primary/30 flex items-center justify-center text-brand-primary group-hover:scale-125 transition-transform mx-auto">
                    <DownloadCloud size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('onboarding.import_cv') || 'Importer un CV'}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{t('onboarding.import_cv_desc') || 'Téléchargez votre CV en PDF. Notre IA l\'analysera automatiquement.'}</p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PDF uniquement</div>
                </div>
              </div>

              {/* Manual Entry */}
              <button 
                onClick={() => setMode('form')}
                className="p-8 rounded-2xl border-2 border-dashed border-border-subtle bg-gradient-to-br from-brand-secondary/10 to-brand-accent/10 hover:border-brand-secondary hover:bg-brand-secondary/20 transition-all text-center space-y-4 group"
              >
                <div className="w-16 h-16 rounded-xl bg-brand-secondary/30 flex items-center justify-center text-brand-secondary group-hover:scale-125 transition-transform mx-auto">
                  <FileText size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('onboarding.fill_manual') || 'Remplir manuellement'}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{t('onboarding.fill_manual_desc') || 'Entrez vos informations directement. Rapide et simple.'}</p>
                </div>
                <div className="pt-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">5 minutes</div>
              </button>
            </div>

            {/* Skip Option */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent"></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">OU</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent"></div>
            </div>
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  const path = `profiles/${session.uid}`;
                  await setDoc(doc(db, path), {
                    name: session.displayName || t('common.user') || 'User',
                    target_role: t('common.to_define') || 'À définir',
                    email: session.email,
                    user_id: session.uid,
                    role_type: roleType,
                    skills: [],
                    experiences: [],
                    education: [],
                    language: language,
                    updated_at: Timestamp.now()
                  });
                  onComplete();
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, `profiles/${session.uid}`);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="text-slate-500 hover:text-brand-primary text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {loading ? '...' : (t('onboarding.skip') || 'Ignorer pour maintenant')}
            </button>
            </div>
          </div>
        )}



        {mode === 'form' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setMode('choice')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ChevronRight className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('onboarding.fill_manual')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.full_name')}</label>
                <input className="input-field" placeholder={t('settings.full_name')} id="onboarding-name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.target_role')}</label>
                <input className="input-field" placeholder={t('settings.target_role_placeholder')} id="onboarding-role" />
              </div>
            </div>
            <button 
              onClick={async () => {
                const name = (document.getElementById('onboarding-name') as HTMLInputElement).value;
                const role = (document.getElementById('onboarding-role') as HTMLInputElement).value;
                if (!name || !role) return;
                setLoading(true);
                try {
                  const path = `profiles/${session.uid}`;
                  await setDoc(doc(db, path), {
                    name,
                    target_role: role,
                    email: session.email,
                    user_id: session.uid,
                    role_type: roleType,
                    language: language,
                    skills: [],
                    experiences: [],
                    education: [],
                    updated_at: Timestamp.now()
                  });
                  onComplete();
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, `profiles/${session.uid}`);
                } finally {
                  setLoading(false);
                }
              }}
              className="btn-primary w-full"
            >
              {t('common.save')}
            </button>
          </div>
        )}

        {mode === 'recruiter_form' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setMode('role')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ChevronRight className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profil Recruteur</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Nom Complet</label>
                <input className="input-field" placeholder="Votre nom" id="recruiter-name" defaultValue={session.displayName || ''} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Entreprise</label>
                <input className="input-field" placeholder="Nom de l'entreprise" id="recruiter-company" />
              </div>
            </div>
            <button 
              onClick={async () => {
                const name = (document.getElementById('recruiter-name') as HTMLInputElement).value;
                const company = (document.getElementById('recruiter-company') as HTMLInputElement).value;
                if (!name || !company) return;
                setLoading(true);
                try {
                  const path = `profiles/${session.uid}`;
                  await setDoc(doc(db, path), {
                    name,
                    company,
                    email: session.email,
                    user_id: session.uid,
                    role_type: roleType,
                    language: language,
                    updated_at: Timestamp.now()
                  });
                  onComplete();
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, `profiles/${session.uid}`);
                } finally {
                  setLoading(false);
                }
              }}
              className="btn-primary w-full"
            >
              Commencer à recruter
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Dashboard({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  const [stats, setStats] = useState({ applications: 0, avgScore: 0 });
  const [recentJobs, setRecentJobs] = useState<JobOffer[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'applications'), where('user_id', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => doc.data());
      setStats({
        applications: apps.length,
        avgScore: apps.length > 0 ? Math.round(apps.reduce((acc, curr) => acc + (curr.ats_score || 0), 0) / apps.length) : 0
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchTopJobs = async () => {
      setLoadingJobs(true);
      try {
        const results = await searchJobs(profile.target_role, profile.location);
        setRecentJobs(results.slice(0, 3));
      } catch (error) {
        console.error("Error fetching top jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchTopJobs();
  }, [profile.target_role, profile.location]);

  const calculateCompletion = () => {
    let score = 0;
    if (profile.name) score += 10;
    if (profile.email) score += 10;
    if (profile.phone) score += 10;
    if (profile.location) score += 10;
    if (profile.skills?.length > 0) score += 20;
    if (profile.experiences?.length > 0) score += 20;
    if (profile.education?.length > 0) score += 20;
    return score;
  };

  const completion = calculateCompletion();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            {t('dashboard.welcome')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">{profile.name?.split(' ')[0] || t('common.candidate')}</span> 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">{t('dashboard.welcome_back')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-3 bg-white/80 dark:bg-slate-900/50 px-5 py-3 rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-secondary animate-pulse shadow-[0_0_10px_rgba(var(--brand-secondary-rgb),0.5)]"></div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">{t('dashboard.market_analysis')}</span>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))} className="btn-primary flex items-center gap-3 px-8 py-4 shadow-2xl shadow-brand-primary/30 group">
            <Search size={20} className="group-hover:scale-110 transition-transform" /> 
            <span className="font-black uppercase tracking-widest text-sm">{t('dashboard.explore')}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={<History className="text-blue-500" />} 
          label={t('dashboard.stats.applications')} 
          value={stats.applications.toString()} 
          sub={t('dashboard.stats.docs_generated')}
          trend={t('dashboard.stats.weekly_trend')}
        />
        <StatCard 
          icon={<Target className="text-brand-primary" />} 
          label={t('dashboard.stats.avg_score')} 
          value={`${stats.avgScore}%`} 
          sub={t('dashboard.stats.ats_match')}
          trend={t('dashboard.stats.global_rank')}
        />
        <StatCard 
          icon={<TrendingUp className="text-brand-secondary" />} 
          label={t('dashboard.stats.progression')} 
          value="+12%" 
          sub={t('dashboard.stats.this_month')}
          trend={t('dashboard.stats.rising')}
        />
        <StatCard 
          icon={<Briefcase className="text-amber-500" />} 
          label={t('dashboard.stats.offers_viewed')} 
          value="42" 
          sub={t('dashboard.stats.last_24h')}
          trend={t('dashboard.stats.intense_activity')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Profile Completion */}
          <div className="glass-card p-10 relative overflow-hidden group bg-gradient-to-br from-white via-white dark:from-slate-900 dark:via-slate-900 to-brand-primary/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-brand-primary/20 transition-all duration-1000"></div>
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-secondary" strokeWidth="3" strokeDasharray={`${completion}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{completion}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.profile_completion')}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-medium">{t('dashboard.completion_desc')}</p>
                <div className="pt-2">
                  <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'profile' }))} className="text-brand-secondary text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all mx-auto md:mx-0">
                    {t('dashboard.complete_profile')} <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Top Offers */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                <Sparkles className="text-brand-primary" size={24} />
                {t('dashboard.top_offers')}
              </h3>
              <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))} className="text-xs font-black text-brand-primary uppercase tracking-widest hover:underline">{t('dashboard.view_all_jobs')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loadingJobs ? (
                [1,2,3].map(i => <div key={i} className="h-40 bg-slate-100/80 dark:bg-slate-800/50 rounded-[2rem] animate-pulse" />)
              ) : recentJobs.length > 0 ? (
                recentJobs.map((job, i) => (
                  <div key={i} className="glass-card p-6 space-y-4 hover:border-brand-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-slate-900 dark:hover:text-white transition-all shadow-lg">
                        <Briefcase size={20} />
                      </div>
                      <span className="text-[10px] font-black text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-full border border-brand-secondary/20">{t('dashboard.match_score')} 95%</span>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{job.title}</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest truncate">{job.company}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">{job.location}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-16 text-center glass-card border-dashed">
                  <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">{t('dashboard.no_offers')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-6 h-px bg-amber-500"></div>
                {t('dashboard.gaps')}
              </h3>
              <div className="space-y-4">
                {profile.top_gaps?.slice(0, 3).map((gap, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 space-y-2 group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">{gap.gap}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{gap.priority}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{gap.action}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-6 h-px bg-brand-secondary"></div>
                {t('dashboard.expertise')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.slice(0, 12).map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/5 hover:border-brand-secondary/30 transition-all">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          {/* Quick Actions */}
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-6 h-px bg-brand-primary"></div>
              {t('dashboard.quick_actions')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-brand-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                  <Search size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('common.jobs')}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'profile' }))}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-brand-secondary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform">
                  <UserIcon size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('common.profile')}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'coach' }))}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-purple-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                  <Sparkles size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('common.coach')}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'applications' }))}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <History size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('common.applications')}</span>
              </button>
            </div>
          </div>

          {/* Coach Tip */}
          <div className="glass-card p-8 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30 space-y-6 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-slate-50 dark:bg-white/5 rounded-full blur-3xl group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-all"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary shadow-lg">
                <Cpu size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.coach_tip')}</h3>
            </div>
            <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed italic font-medium relative z-10">
              "Pour votre profil de {profile.target_role}, mettre en avant vos projets Open Source pourrait augmenter votre score de matching de 15%."
            </p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'coach' }))} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest transition-all relative z-10">
              {t('dashboard.coach_report')}
            </button>
          </div>

            <div className="glass-card p-8 space-y-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-6 h-px bg-slate-500"></div>
                {t('dashboard.recent_activity')}
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('dashboard.activity_cv')}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{t('dashboard.activity_cv_desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shrink-0 group-hover:scale-110 transition-transform">
                    <Check size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('dashboard.activity_profile')}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{t('dashboard.activity_profile_desc')}</p>
                  </div>
                </div>
              </div>
            </div>

          <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-brand-primary/20 border-brand-primary/30 space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-slate-900 dark:text-white shadow-xl shadow-brand-primary/20">
                <Rocket size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('landing.plan_elite')}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium relative z-10">{t('dashboard.elite_desc')}</p>
            <button className="w-full btn-primary py-4 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-brand-primary/30 relative z-10 hover:scale-[1.02] transition-transform">
              {t('dashboard.upgrade_elite')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, sub, trend }: { icon: React.ReactNode, label: string, value: string, sub: string, trend?: string }) {
  return (
    <div className="glass-card flex flex-col gap-4 group hover:border-brand-primary/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && <span className="text-[10px] font-bold text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h4>
        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

function JobSearch({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(profile.target_role);
  const [location, setLocation] = useState(profile.location);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await searchJobs(searchQuery, location);
      setJobs(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleSearch(); }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="glass-card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.target_role')}</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 w-4 h-4" />
              <input className="input-field pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.location')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 w-4 h-4" />
              <input className="input-field pl-10" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search size={18} />}
              {t('common.search')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
          <div className="flex flex-wrap gap-3">
          {['Remote', 'Full-time', 'Freelance', 'Stage', 'CDI', 'CDD'].map((filter) => (
            <button 
              key={filter}
              className="px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:border-brand-primary/30 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              {filter}
            </button>
          ))}
          </div>
          <button onClick={() => alert('Candidature automatique lancée ! (Simulation)')} className="btn-secondary flex items-center gap-2 text-xs py-2">
            <Zap size={14} className="text-amber-500" /> Candidature Spontanée Auto
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">{t('jobs.searching')}</p>
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job, i) => <JobCard key={i} job={job} profile={profile} t={t} />)
        ) : (
          <div className="py-20 text-center glass-card">
            <p className="text-slate-600 dark:text-slate-400">{t('jobs.no_results')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function JobCard({ job, profile, t }: { job: JobOffer, profile: UserProfile, t: (p: string) => string }) {
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const autoScore = async () => {
      if (atsResult || loading) return;
      setLoading(true);
      try {
        const result = await scoreJobMatch(profile, job);
        setAtsResult(result);
      } catch (error) {
        console.error("Scoring error:", error);
      } finally {
        setLoading(false);
      }
    };
    autoScore();
  }, [job, profile]);

  return (
    <div className="glass-card hover:border-brand-primary/50 transition-all group overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors tracking-tight">{job.title}</h3>
                <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-border-muted text-[10px] font-black uppercase tracking-widest">{job.source}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-brand-primary" /><span>{job.company}</span></div>
                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-secondary" /><span>{job.location}</span></div>
                <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-600 dark:text-slate-400" /><span>{job.posted_at}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 shrink-0">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-border-muted">
                <Loader2 className="animate-spin w-4 h-4 text-brand-primary" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('jobs.analyzing')}</span>
              </div>
            ) : atsResult ? (
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all shadow-lg",
                atsResult.ats_score >= 80 ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-green-500/10" :
                atsResult.ats_score >= 60 ? "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-amber-500/10" :
                "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10"
              )}>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Match Score</p>
                  <p className="text-xl font-black">{atsResult.ats_score}%</p>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-current/20 flex items-center justify-center relative">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-current opacity-10" strokeWidth="4" />
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-current" strokeWidth="4" strokeDasharray={`${atsResult.ats_score}, 100`} strokeLinecap="round" />
                  </svg>
                  <Target size={16} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-white/5"
            >
              {showDetails ? t('common.hide') : t('common.details')}
            </button>
            <a 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary px-6 py-2 text-xs shadow-lg shadow-brand-primary/20"
            >
              {t('jobs.apply_now')}
            </a>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/5 space-y-6">
              {atsResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      {t('jobs.match_keywords')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {atsResult.matched_keywords?.map((kw, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] border border-green-500/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-500" />
                      {t('jobs.missing_keywords')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {atsResult.missing_keywords?.map((kw, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] border border-red-500/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white/80 dark:bg-slate-900/50 p-4 rounded-lg border border-border-muted">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('jobs.ai_recommendation')}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{atsResult?.recommendation}</p>
              </div>

              <div className="flex justify-end gap-3">
                <GenerateDocButton type="cv" job={job} profile={profile} t={t} />
                <GenerateDocButton type="cover_letter" job={job} profile={profile} t={t} />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('jobs.job_description')}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerateDocButton({ type, job, profile, t }: { type: 'cv' | 'cover_letter', job: JobOffer, profile: UserProfile, t: (p: string) => string }) {
  const [loading, setLoading] = useState(false);
  const [docContent, setDocContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const content = await generateTargetedDocument(type, profile, job);
      setDocContent(content);
      await addDoc(collection(db, 'applications'), {
        user_id: auth.currentUser?.uid,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        status: 'Generated',
        date: new Date().toISOString(),
        url: job.url,
        type,
        content
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'applications');
    } finally {
      setLoading(false);
    }
  };

  if (docContent) {
    return (
      <button onClick={() => downloadAsPDF(docContent, `${type}_${job.company}`)} className="btn-secondary text-xs py-1.5 flex items-center gap-2 bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20">
        <DownloadCloud size={14} /> {t('common.download')} {type === 'cv' ? 'CV' : t('common.letter_short')}
      </button>
    );
  }

  return (
    <button onClick={handleGenerate} disabled={loading} className="btn-secondary text-xs py-1.5 flex items-center gap-2">
      {loading ? <Loader2 className="animate-spin w-3 h-3" /> : <Plus size={14} />} {t('common.generate')} {type === 'cv' ? 'CV' : t('common.letter_short')}
    </button>
  );
}

function Applications({ session, t }: { session: User, t: (p: string) => string }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cv' | 'cover_letter'>('all');
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'applications'), where('user_id', '==', session.uid), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications'));
    return unsubscribe;
  }, [session]);

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${appId}`);
    }
  };

  const filteredApps = apps.filter(app => filter === 'all' || app.type === filter);

  const stats = {
    total: apps.length,
    pending: apps.filter(a => a.status === 'pending' || a.status === 'Generated').length,
    interviews: apps.filter(a => a.status === 'interview').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('common.applications')}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('applications.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-xl border border-border-muted">
            <button onClick={() => setFilter('all')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", filter === 'all' ? "bg-brand-primary text-slate-900 dark:text-white shadow-lg" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>{t('common.all')}</button>
            <button onClick={() => setFilter('cv')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", filter === 'cv' ? "bg-brand-primary text-slate-900 dark:text-white shadow-lg" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>CVs</button>
            <button onClick={() => setFilter('cover_letter')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", filter === 'cover_letter' ? "bg-brand-primary text-slate-900 dark:text-white shadow-lg" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>{t('common.letters')}</button>
          </div>
          <button onClick={() => setShowManualModal(true)} className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-xl shadow-brand-primary/20">
            <Plus size={18} /> {t('common.add')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStat label={t('common.total')} value={stats.total} color="blue" />
        <MiniStat label={t('applications.pending')} value={stats.pending} color="amber" />
        <MiniStat label={t('applications.interviews')} value={stats.interviews} color="purple" />
        <MiniStat label={t('applications.accepted')} value={stats.accepted} color="green" />
        <MiniStat label={t('applications.rejected')} value={stats.rejected} color="red" />
      </div>

      {showManualModal && (
        <ManualApplicationModal onClose={() => setShowManualModal(false)} session={session} t={t} />
      )}

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="glass-card flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-brand-primary/30 transition-all">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0", 
                  app.type === 'cv' ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-secondary/10 text-brand-secondary"
                )}>
                  <FileText size={28} />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors truncate text-lg tracking-tight">{app.jobTitle}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">
                    <span className="flex items-center gap-1"><Briefcase size={12} />{app.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{new Date(app.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <select 
                    value={app.status || 'pending'} 
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-white/80 dark:bg-slate-900/50 cursor-pointer outline-none transition-all",
                      app.status === 'accepted' ? "text-green-500 border-green-500/20" :
                      app.status === 'interview' ? "text-purple-500 border-purple-500/20" :
                      app.status === 'rejected' ? "text-red-500 border-red-500/20" :
                      "text-amber-500 border-amber-500/20"
                    )}
                  >
                    <option value="pending">{t('applications.pending')}</option>
                    <option value="Generated">{t('applications.generated')}</option>
                    <option value="interview">{t('applications.interview')}</option>
                    <option value="accepted">{t('applications.accepted')}</option>
                    <option value="rejected">{t('applications.rejected')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => downloadAsPDF(app.content, `${app.type}_${app.company}`)} 
                    className="p-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-white/5"
                    title={t('common.download')}
                  >
                    <Download size={20} />
                  </button>
                  {app.url && (
                    <a 
                      href={app.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 text-slate-600 dark:text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all border border-slate-200 dark:border-white/5"
                      title={t('common.view_offer')}
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass-card border-dashed">
          <FileText className="w-16 h-16 text-slate-700 dark:text-slate-300 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 tracking-tight">{t('applications.no_docs')}</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-xs mx-auto mt-2 font-medium">{t('applications.no_docs_desc')}</p>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))} className="btn-primary mt-6 px-8">{t('dashboard.view_all_jobs')}</button>
        </div>
      )}
    </motion.div>
  );
}

function MiniStat({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 glass-card", colors[color])}>
      <span className="text-2xl font-black">{value}</span>
      <span className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</span>
    </div>
  );
}

function Coach({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'applications'), where('user_id', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApps(snapshot.docs.map(doc => doc.data()));
    });
    return unsubscribe;
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await getCareerCoachReport(profile, apps);
      setReport(res);
    } catch (error) { 
      console.error("Coach error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('common.coach')}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('coach.subtitle')}</p>
        </div>
        <button 
          onClick={handleGenerateReport} 
          disabled={loading} 
          className="btn-primary flex items-center gap-3 px-8 py-3 shadow-2xl shadow-brand-primary/30"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles size={20} />} 
          <span className="font-black uppercase tracking-widest text-sm">{t('coach.generate_report')}</span>
        </button>
      </header>

      {report ? (
        <div className="space-y-6">
          <div className="glass-card p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={120} />
            </div>
            <div className="prose prose-invert max-w-none 
              prose-headings:text-brand-primary prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:border-b prose-headings:border-slate-200 dark:border-white/5 prose-headings:pb-4
              prose-strong:text-slate-900 dark:text-white prose-strong:font-black
              prose-p:text-slate-700 dark:text-slate-300 prose-p:leading-relaxed prose-p:text-lg
              prose-li:text-slate-700 dark:text-slate-300 prose-li:marker:text-brand-primary
              prose-hr:border-slate-200 dark:border-white/5">
              <Markdown>{report}</Markdown>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Clock size={18} />
                </div>
                <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('coach.report_generated')} {new Date().toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => downloadAsPDF(report, `coach_report_${new Date().toISOString().split('T')[0]}`)}
                  className="btn-secondary flex items-center gap-2 px-6 py-2 text-xs"
                >
                  <DownloadCloud size={16} /> {t('common.export_pdf')}
                </button>
                <button onClick={() => setReport(null)} className="text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest underline transition-colors">{t('coach.new_report')}</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card py-24 text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none"></div>
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-slate-900 dark:text-white mx-auto shadow-2xl shadow-brand-primary/20 relative z-10">
              <Sparkles size={56} />
            </div>
            <div className="max-w-md mx-auto space-y-4 relative z-10">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('coach.ready_title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-lg">{t('coach.ready_desc').replace('{count}', apps.length.toString())}</p>
            </div>
            <button onClick={handleGenerateReport} disabled={loading} className="btn-primary px-12 py-4 text-lg shadow-xl shadow-brand-primary/20 relative z-10">
              <span className="font-black uppercase tracking-widest">{t('coach.start_analysis')}</span>
            </button>
          </div>
          
          <div className="space-y-6">
            <CoachFeatureCard 
              icon={<Zap size={20} />}
              title={t('coach.feature_strategy_title')}
              description={t('coach.feature_strategy_desc')}
              color="amber"
            />
            <CoachFeatureCard 
              icon={<Target size={20} />}
              title={t('coach.feature_optimize_title')}
              description={t('coach.feature_optimize_desc')}
              color="purple"
            />
            <CoachFeatureCard 
              icon={<TrendingUp size={20} />}
              title={t('coach.feature_interview_title')}
              description={t('coach.feature_interview_desc')}
              color="green"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CoachFeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  const colors: Record<string, string> = {
    amber: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    purple: "text-purple-500 border-purple-500/20 bg-purple-500/5",
    green: "text-green-500 border-green-500/20 bg-green-500/5",
  };

  return (
    <div className={cn("glass-card p-6 space-y-3", colors[color])}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color].split('')[2])}>
          {icon}
        </div>
        <h4 className="font-black uppercase tracking-widest text-xs text-slate-900 dark:text-white">{title}</h4>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

function ProfilePage({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-transparent to-brand-secondary/10 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="w-32 h-32 rounded-[2rem] bg-white dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white text-5xl font-black shadow-2xl relative border border-slate-200 dark:border-white/10">
              {profile.name?.charAt(0) || '?'}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-slate-900 dark:text-white shadow-lg border-4 border-white dark:border-slate-900">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{profile.name || t('profile.incomplete')}</h1>
              <span className="badge bg-brand-primary/20 text-brand-primary border-brand-primary/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest self-center md:self-auto">Elite Talent</span>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center md:justify-start gap-2">
              <Briefcase size={20} className="text-brand-primary" />
              {profile.target_role} <span className="text-slate-600 dark:text-slate-400">•</span> {profile.location}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">
                <Mail size={16} className="text-brand-primary" /> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">
                <Phone size={16} className="text-brand-secondary" /> {profile.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">
                <Globe size={16} className="text-slate-600 dark:text-slate-400" /> Portfolio
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10 self-center lg:self-auto">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'settings' }))}
            className="btn-secondary flex items-center gap-2 px-6 py-3 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-sm font-black uppercase tracking-widest"
          >
            <Edit3 size={18} /> {t('common.edit')}
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'applications' }))} className="btn-primary flex items-center gap-2 px-8 py-3 shadow-xl shadow-brand-primary/20 text-sm font-black uppercase tracking-widest">
            <FileText size={18} /> {t('common.applications')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Employability Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-10 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30 relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-slate-50 dark:bg-white/5 rounded-full blur-3xl group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-all"></div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-8 h-px bg-slate-300 dark:bg-white/30"></div>
                    {t('dashboard.employability')}
                  </h3>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-900 dark:text-white backdrop-blur-md">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">84</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white/50 tracking-tighter">/100</span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '84%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-white to-brand-primary shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-900 dark:text-white/70 uppercase tracking-widest text-right">+5% vs le mois dernier</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-10 space-y-6 bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-white/5">
              <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-8 h-px bg-brand-primary"></div>
                {t('profile.ai_analysis')}
              </h3>
              <div className="space-y-4">
                {[
                  { label: t('profile.relevance'), score: 92, color: 'text-green-500' },
                  { label: t('profile.coherence'), score: 88, color: 'text-blue-500' },
                  { label: t('profile.keywords'), score: 72, color: 'text-amber-500' }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className={item.color}>{item.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full bg-current opacity-50", item.color.replace('text-', 'bg-'))} style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Résumé */}
          <section className="glass-card p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Quote size={80} />
            </div>
            <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="w-8 h-px bg-brand-primary"></div>
              {t('settings.summary')}
            </h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight italic">
              "{profile.profile_summary}"
            </p>
          </section>

          {/* Expériences */}
          <section className="glass-card p-10 space-y-10">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
              <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-8 h-px bg-brand-primary"></div>
                {t('settings.experience')}
              </h3>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{profile.experience_years} {t('profile.exp_years')}</span>
            </div>
            <div className="space-y-12 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-brand-primary before:via-brand-secondary before:to-transparent">
              {profile.experiences?.map((exp, i) => (
                <div key={i} className="relative pl-12 group">
                  <div className="absolute left-0 top-2 w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border-2 border-brand-primary z-10 group-hover:scale-110 group-hover:bg-brand-primary transition-all flex items-center justify-center shadow-xl">
                    <Briefcase size={14} className="group-hover:text-slate-900 dark:hover:text-white transition-colors" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors tracking-tight">{exp.role}</h4>
                      <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 uppercase tracking-widest">{exp.period}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Building2 size={14} className="text-brand-primary" /> {exp.company}</span>
                      <span className="text-slate-800 dark:text-slate-200">•</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-secondary" /> {exp.location}</span>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 mt-6">
                      {(exp.description || []).map((desc, j) => (
                        <li key={j} className="text-slate-600 dark:text-slate-400 text-sm font-medium flex items-start gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.5)]"></div>
                          {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Formation */}
          <section className="glass-card p-10 space-y-10">
            <h3 className="text-xs font-black text-brand-secondary uppercase tracking-[0.3em] flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-6">
              <div className="w-8 h-px bg-brand-secondary"></div>
              {t('settings.education')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {profile.education?.map((edu, i) => (
                <div key={i} className="flex gap-6 group p-6 rounded-3xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-brand-secondary/30 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-slate-900 dark:hover:text-white transition-all shrink-0 shadow-lg">
                    <GraduationCap size={28} />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight leading-tight">{edu.degree}</h4>
                    <p className="text-brand-secondary font-black text-[10px] uppercase tracking-widest">{edu.school}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-2">
                      <span>{edu.period}</span>
                      <span>•</span>
                      <span>{edu.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-10">
          {/* Score Card */}
          <section className="glass-card p-8 text-center space-y-8 bg-gradient-to-b from-slate-900 to-brand-primary/10 border-brand-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--brand-primary-rgb),0.1)_0%,transparent_70%)]"></div>
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em] relative z-10">Employabilité IA</h3>
            <div className="relative w-48 h-48 mx-auto z-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-800" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-primary" strokeWidth="3" strokeDasharray={`${profile.employability_score}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{profile.employability_score}%</span>
                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] mt-1">Elite Candidate</span>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Votre profil est optimisé pour le marché <strong>{profile.location}</strong>.
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={14} className={cn(s <= 4 ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-700")} />
                ))}
              </div>
            </div>
          </section>

          {/* Compétences */}
          <section className="glass-card p-8 space-y-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-6 h-px bg-brand-primary"></div>
              {t('profile.tech_stack')}
            </h3>
            <div className="flex flex-wrap gap-3">
              {profile.skills?.map((s, i) => (
                <span key={i} className="px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/5 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-default">
                  {s}
                </span>
              ))}
            </div>
          </section>

          {/* Langues */}
          <section className="glass-card p-8 space-y-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-6 h-px bg-brand-secondary"></div>
              {t('profile.languages')}
            </h3>
            <div className="space-y-4">
              {profile.languages?.map((lang, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-900 dark:text-white">{lang}</span>
                    <span className="text-brand-secondary">{t('profile.mastery')}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-secondary rounded-full" style={{ width: i === 0 ? '100%' : i === 1 ? '85%' : '60%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <section className="glass-card p-8 space-y-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-6 h-px bg-amber-500"></div>
                {t('settings.certifications')}
              </h3>
              <div className="space-y-4">
                {(profile.certifications || []).map((cert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 group hover:bg-amber-500/10 transition-all">
                    <Award size={20} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:hover:text-white transition-colors">{cert}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gaps */}
          <section className="glass-card p-8 space-y-6 border-amber-500/20 bg-amber-500/5">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-6 h-px bg-amber-500"></div>
              {t('dashboard.gaps')}
            </h3>
            <div className="space-y-4">
              {profile.top_gaps?.map((gap, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 space-y-3 group hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">{gap.gap}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      gap.priority === 'high' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                    )}>{gap.priority}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{gap.action}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsPage({ profile, language, setLanguage, t }: { profile: UserProfile, language: Language, setLanguage: (l: Language) => void, t: (p: string) => string }) {
  const [editData, setEditData] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    location: profile.location || '',
    target_role: profile.target_role || '',
    profile_summary: profile.profile_summary || '',
    skills: profile.skills?.join(', ') || '',
    languages: profile.languages?.join(', ') || '',
    certifications: profile.certifications?.join(', ') || '',
    interests: profile.interests?.join(', ') || '',
    experiences: profile.experiences || [],
    education: profile.education || []
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const path = `profiles/${auth.currentUser.uid}`;
      await updateDoc(doc(db, path), {
        ...editData,
        skills: typeof editData.skills === 'string' ? editData.skills.split(',').map(s => s.trim()).filter(s => s !== '') : editData.skills,
        languages: typeof editData.languages === 'string' ? editData.languages.split(',').map(s => s.trim()).filter(s => s !== '') : editData.languages,
        certifications: typeof editData.certifications === 'string' ? editData.certifications.split(',').map(s => s.trim()).filter(s => s !== '') : editData.certifications,
        interests: typeof editData.interests === 'string' ? editData.interests.split(',').map(s => s.trim()).filter(s => s !== '') : editData.interests,
        language,
        updated_at: Timestamp.now()
      });
      alert(t('common.saved'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-8 py-3 flex items-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Check size={18} />}
          {t('common.save')}
        </button>
      </header>

      <div className="space-y-6">
        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon className="text-brand-primary" size={20} />
            {t('settings.personal_info')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.full_name')}</label>
              <input 
                className="input-field" 
                value={editData.name} 
                onChange={e => setEditData({...editData, name: e.target.value})}
                placeholder={t('settings.full_name')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.phone')}</label>
              <input 
                className="input-field" 
                value={editData.phone} 
                onChange={e => setEditData({...editData, phone: e.target.value})}
                placeholder={t('settings.phone_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.location')}</label>
              <input 
                className="input-field" 
                value={editData.location} 
                onChange={e => setEditData({...editData, location: e.target.value})}
                placeholder={t('settings.location_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.target_role')}</label>
              <input 
                className="input-field" 
                value={editData.target_role} 
                onChange={e => setEditData({...editData, target_role: e.target.value})}
                placeholder={t('settings.target_role_placeholder')}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.profile_summary')}</label>
              <textarea 
                className="input-field min-h-[100px]" 
                value={editData.profile_summary} 
                onChange={e => setEditData({...editData, profile_summary: e.target.value})}
                placeholder={t('settings.summary_placeholder')}
              />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="text-brand-primary" size={20} />
            {t('settings.skills_langs')}
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.skills_langs')} ({t('settings.skills_placeholder')})</label>
              <textarea 
                className="input-field min-h-[100px]" 
                value={editData.skills} 
                onChange={e => setEditData({...editData, skills: e.target.value})}
                placeholder={t('settings.skills_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.lang_prefs')} ({t('settings.langs_placeholder')})</label>
              <input 
                className="input-field" 
                value={editData.languages} 
                onChange={e => setEditData({...editData, languages: e.target.value})}
                placeholder={t('settings.langs_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.certifications')}</label>
              <input 
                className="input-field" 
                value={editData.certifications} 
                onChange={e => setEditData({...editData, certifications: e.target.value})}
                placeholder={t('settings.certifications_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.interests')}</label>
              <input 
                className="input-field" 
                value={editData.interests} 
                onChange={e => setEditData({...editData, interests: e.target.value})}
                placeholder={t('settings.interests_placeholder')}
              />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="text-brand-primary" size={20} />
            {t('settings.work_exp')}
          </h3>
          <div className="space-y-6">
            {editData.experiences.map((exp, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 space-y-4 relative group">
                <button 
                  onClick={() => {
                    const newExps = [...editData.experiences];
                    newExps.splice(idx, 1);
                    setEditData({...editData, experiences: newExps});
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Poste</label>
                    <input 
                      className="input-field" 
                      value={exp.role} 
                      onChange={e => {
                        const newExps = [...editData.experiences];
                        newExps[idx].role = e.target.value;
                        setEditData({...editData, experiences: newExps});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Entreprise</label>
                    <input 
                      className="input-field" 
                      value={exp.company} 
                      onChange={e => {
                        const newExps = [...editData.experiences];
                        newExps[idx].company = e.target.value;
                        setEditData({...editData, experiences: newExps});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Période</label>
                    <input 
                      className="input-field" 
                      value={exp.period} 
                      onChange={e => {
                        const newExps = [...editData.experiences];
                        newExps[idx].period = e.target.value;
                        setEditData({...editData, experiences: newExps});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Lieu</label>
                    <input 
                      className="input-field" 
                      value={exp.location} 
                      onChange={e => {
                        const newExps = [...editData.experiences];
                        newExps[idx].location = e.target.value;
                        setEditData({...editData, experiences: newExps});
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Description (un point par ligne)</label>
                  <textarea 
                    className="input-field min-h-[100px]" 
                    value={exp.description.join('\n')} 
                    onChange={e => {
                      const newExps = [...editData.experiences];
                      newExps[idx].description = e.target.value.split('\n');
                      setEditData({...editData, experiences: newExps});
                    }}
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setEditData({
                ...editData, 
                experiences: [...editData.experiences, { role: '', company: '', location: '', period: '', description: [] }]
              })}
              className="w-full p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-white/20 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"
            >
              <Plus size={16} />
              Ajouter une expérience
            </button>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="text-brand-secondary" size={20} />
            Formation Académique
          </h3>
          <div className="space-y-6">
            {editData.education.map((edu, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 space-y-4 relative group">
                <button 
                  onClick={() => {
                    const newEdu = [...editData.education];
                    newEdu.splice(idx, 1);
                    setEditData({...editData, education: newEdu});
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Diplôme</label>
                    <input 
                      className="input-field" 
                      value={edu.degree} 
                      onChange={e => {
                        const newEdu = [...editData.education];
                        newEdu[idx].degree = e.target.value;
                        setEditData({...editData, education: newEdu});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">École / Université</label>
                    <input 
                      className="input-field" 
                      value={edu.school} 
                      onChange={e => {
                        const newEdu = [...editData.education];
                        newEdu[idx].school = e.target.value;
                        setEditData({...editData, education: newEdu});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Période</label>
                    <input 
                      className="input-field" 
                      value={edu.period} 
                      onChange={e => {
                        const newEdu = [...editData.education];
                        newEdu[idx].period = e.target.value;
                        setEditData({...editData, education: newEdu});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Lieu</label>
                    <input 
                      className="input-field" 
                      value={edu.location} 
                      onChange={e => {
                        const newEdu = [...editData.education];
                        newEdu[idx].location = e.target.value;
                        setEditData({...editData, education: newEdu});
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Détails</label>
                  <textarea 
                    className="input-field min-h-[80px]" 
                    value={edu.details} 
                    onChange={e => {
                      const newEdu = [...editData.education];
                      newEdu[idx].details = e.target.value;
                      setEditData({...editData, education: newEdu});
                    }}
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setEditData({
                ...editData, 
                education: [...editData.education, { degree: '', school: '', location: '', period: '', details: '' }]
              })}
              className="w-full p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-white/20 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"
            >
              <Plus size={16} />
              {t('settings.add_edu')}
            </button>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-secondary" size={20} />
            Compte & Sécurité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Email</label>
              <input className="input-field opacity-50" value={auth.currentUser?.email || ''} readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">ID Utilisateur</label>
              <input className="input-field opacity-50" value={auth.currentUser?.uid || ''} readOnly />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="text-blue-500" size={20} />
            {t('settings.lang_prefs')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'fr', label: 'Français' },
              { id: 'en', label: 'English' },
              { id: 'ar', label: 'العربية' }
            ].map((lang) => (
              <button 
                key={lang.id}
                onClick={() => setLanguage(lang.id as Language)}
                className={cn(
                  "p-4 rounded-2xl border transition-all font-black uppercase tracking-widest text-xs",
                  language === lang.id 
                    ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" 
                    : "bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:border-white/20"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="text-purple-500" size={20} />
            {t('settings.notifications')}
          </h3>
          <div className="space-y-4">
            {[
              { label: t('settings.notif_job_alerts'), desc: t('settings.notif_job_alerts_desc') },
              { label: t('settings.notif_weekly_reports'), desc: t('settings.notif_weekly_reports_desc') },
              { label: t('settings.notif_recruiter_msgs'), desc: t('settings.notif_recruiter_msgs_desc') }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
                <div className="w-12 h-6 rounded-full bg-brand-primary/20 border border-brand-primary/30 relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-brand-primary shadow-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="text-green-500" size={20} />
            {t('settings.privacy')}
          </h3>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{t('settings.profile_visibility')}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('settings.profile_visibility_desc')}</p>
            </div>
            <div className="w-12 h-6 rounded-full bg-brand-primary/20 border border-brand-primary/30 relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-brand-primary shadow-lg"></div>
            </div>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-secondary" size={20} />
            {t('settings.subscription')}
          </h3>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{t('landing.plan_free')}</h4>
              <p className="text-slate-600 dark:text-slate-400">{t('settings.free_plan_desc')}</p>
            </div>
            <button className="btn-primary px-8">{t('dashboard.upgrade_elite')}</button>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            {t('settings.danger_zone')}
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-slate-900 dark:text-white">{t('settings.delete_account')}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('settings.delete_account_desc')}</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-slate-900 dark:hover:text-white transition-all font-bold text-sm">
              {t('common.delete')}
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function RecruiterPage({ t }: { t: (p: string) => string }) {
  const [activeView, setActiveView] = useState<'dashboard' | 'post'>('dashboard');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('recruiter.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('recruiter.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveView('dashboard')} className={cn("btn-secondary px-6 py-3 text-xs font-black uppercase tracking-widest", activeView === 'dashboard' && "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-white/20")}>{t('recruiter.dashboard')}</button>
          <button onClick={() => setActiveView('post')} className={cn("btn-secondary px-6 py-3 text-xs font-black uppercase tracking-widest", activeView === 'post' && "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-white/20 flex items-center gap-2")}>
            <Plus size={16} /> {t('recruiter.post_job')}
          </button>
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={<UserIcon className="text-brand-primary" />} label={t('recruiter.active_talents')} value="2,450" sub={t('recruiter.weekly_talent_trend')} trend="+12%" />
            <StatCard icon={<Briefcase className="text-brand-secondary" />} label={t('recruiter.active_offers')} value="18" sub={t('recruiter.pending_offers')} />
            <StatCard icon={<TrendingUp className="text-amber-500" />} label={t('recruiter.match_rate')} value="88%" sub={t('recruiter.platform_avg')} />
            <StatCard icon={<ShieldCheck className="text-blue-500" />} label={t('recruiter.verified')} value="1,120" sub={t('recruiter.certified_profiles')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-8 space-y-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users size={20} className="text-brand-primary" />
                  {t('recruiter.latest_candidates')}
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Ahmed B.', role: 'Senior React Developer', score: 98, skills: ['React', 'Node.js', 'AWS'] },
                    { name: 'Sarra M.', role: 'Product Designer', score: 94, skills: ['Figma', 'UI/UX', 'Prototyping'] },
                    { name: 'Yassine K.', role: 'Data Scientist', score: 91, skills: ['Python', 'PyTorch', 'SQL'] }
                  ].map((talent, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 flex items-center justify-between group hover:border-brand-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black">{talent.name[0]}</div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{talent.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{talent.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex gap-2">
                          {talent.skills.map((s, j) => <span key={j} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-white/5">{s}</span>)}
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-brand-primary uppercase tracking-widest">{t('dashboard.match_score')}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white">{talent.score}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-3 text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">{t('recruiter.view_all')}</button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-8 bg-brand-primary/5 border-brand-primary/20 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <ShieldCheck size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('recruiter.partner_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t('recruiter.partner_desc')}</p>
                </div>
                <ul className="space-y-3">
                  {[t('recruiter.partner_feat1'), t('recruiter.partner_feat2'), t('recruiter.partner_feat3'), t('recruiter.partner_feat4')].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      <CheckCircle size={14} className="text-brand-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full btn-primary py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20">{t('recruiter.become_partner')}</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-12 space-y-8 bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border-brand-primary/20">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary shadow-xl shadow-brand-primary/20">
              <Plus size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('recruiter.post_title')}</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">{t('recruiter.post_desc')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('recruiter.job_title')}</label>
              <input className="input-field" placeholder={t('recruiter.job_title_placeholder')} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('recruiter.location')}</label>
              <input className="input-field" placeholder={t('recruiter.location_placeholder')} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Type de contrat</label>
              <select className="input-field text-slate-700 dark:text-slate-300">
                <option>CDI</option>
                <option>CDD</option>
                <option>Freelance</option>
                <option>Stage</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Salaire (Optionnel)</label>
              <input className="input-field" placeholder="ex: 40k - 60k €" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('recruiter.description')}</label>
              <textarea className="input-field min-h-[200px]" placeholder={t('recruiter.desc_placeholder')}></textarea>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Compétences requises (séparées par des virgules)</label>
              <input className="input-field" placeholder="React, Node.js, TypeScript..." />
            </div>
          </div>
          
          <div className="pt-6 flex justify-end gap-4 border-t border-slate-200 dark:border-white/10">
            <button onClick={() => setActiveView('dashboard')} className="btn-secondary px-8 py-3 text-xs font-black uppercase tracking-widest">{t('common.cancel')}</button>
            <button className="btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-brand-primary/30">
              <Sparkles size={18} /> {t('recruiter.post_job')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ManualApplicationModal({ onClose, session, t }: { onClose: () => void, session: User, t: (p: string) => string }) {
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    url: '',
    status: 'Applied'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        ...formData,
        user_id: session.uid,
        date: new Date().toISOString(),
        type: 'manual'
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'applications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('applications.add_manual')}</h3>
          <button onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.role')}</label>
            <input required className="input-field" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder={t('settings.role')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('settings.company')}</label>
            <input required className="input-field" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder={t('settings.company')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{t('common.url')} ({t('common.optional')})</label>
            <input className="input-field" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function LinkedInOptimization({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const result = await generateLinkedInOptimization(profile);
      setOptimization(result);
    } catch (error) {
      console.error("LinkedIn optimization error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('common.linkedin')}</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">{t('linkedin.subtitle')}</p>
      </header>

      {!optimization ? (
        <div className="glass-card p-12 text-center space-y-8 bg-gradient-to-br from-blue-600/10 to-brand-primary/10 border-blue-500/20">
          <div className="w-24 h-24 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto text-blue-500 shadow-2xl shadow-blue-500/20">
            <Globe size={48} />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('linkedin.ready_title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('linkedin.ready_desc')}</p>
          </div>
          <button 
            onClick={handleOptimize} 
            disabled={loading}
            className="btn-primary px-10 py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 flex items-center gap-3 mx-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            {t('linkedin.generate')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8 prose prose-invert max-w-none">
              <Markdown>{optimization}</Markdown>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4 bg-blue-600/5 border-blue-500/20">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500" />
                {t('linkedin.checklist')}
              </h3>
              <ul className="space-y-3">
                {[t('linkedin.check_photo'), t('linkedin.check_banner'), t('linkedin.check_creator'), t('linkedin.check_url'), t('linkedin.check_network')].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <div className="w-4 h-4 rounded border border-slate-200 dark:border-white/10 flex items-center justify-center"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setOptimization(null)} className="w-full btn-secondary py-3 text-xs uppercase tracking-widest font-black">{t('linkedin.new_report')}</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

async function downloadAsPDF(content: string, filename: string) {
  const element = document.createElement('div');
  // A4 dimensions in pixels at 96 DPI: 794px x 1123px
  element.style.width = '794px';
  element.style.padding = '50px 60px'; // Increased padding for better look
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#1a1a1a';
  element.style.fontFamily = '"Inter", "Helvetica", "Arial", sans-serif';
  element.style.lineHeight = '1.5';
  element.style.fontSize = '11px';
  element.style.boxSizing = 'border-box';
  
  const brandBlue = '#0f172a'; // Darker, more professional blue
  const accentBlue = '#2563eb';

  const lines = content.split('\n');
  let html = '';
  let inHeader = true;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed && !inHeader) {
      html += '<div style="height: 8px;"></div>';
      return;
    }

    // Header Parsing
    if (line.startsWith('# ')) {
      html += `<h1 style="font-size: 24px; font-weight: 900; color: ${brandBlue}; text-align: center; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 2px;">${line.replace('# ', '')}</h1>`;
      return;
    }
    if (line.startsWith('## ')) {
      html += `<h2 style="font-size: 14px; font-weight: 700; color: ${accentBlue}; text-align: center; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">${line.replace('## ', '')}</h2>`;
      return;
    }
    if (line.startsWith('### ')) {
      html += `<h3 style="font-size: 10px; font-weight: 600; color: #64748b; text-align: center; margin-bottom: 8px;">${line.replace('### ', '')}</h3>`;
      return;
    }
    if (inHeader && (trimmed.includes('|') || trimmed.includes('@') || trimmed.includes('linkedin'))) {
      html += `<div style="font-size: 9px; color: #94a3b8; text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">${trimmed}</div>`;
      inHeader = false;
      return;
    }

    // Section Parsing
    if (line.startsWith('--- ') && line.endsWith(' ---')) {
      const title = line.replace(/---/g, '').trim();
      html += `
        <div style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${brandBlue};">
          <h2 style="font-size: 12px; font-weight: 900; color: ${brandBlue}; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
        </div>
      `;
      return;
    }

    // Experience / Education Parsing (Title | Date)
    if (line.startsWith('**') && line.includes('|')) {
      const parts = line.replace(/\*\*/g, '').split('|');
      html += `
        <div style="display: flex; justify-content: space-between; font-weight: 800; color: #0f172a; margin-top: 12px; font-size: 11px;">
          <span>${parts[0].trim()}</span>
          <span style="color: ${accentBlue}; font-size: 10px;">${parts[1].trim()}</span>
        </div>
      `;
      return;
    }

    // Company / Location Parsing (*Company* | Location)
    if (line.startsWith('*') && line.includes('|')) {
      const parts = line.replace(/\*/g, '').split('|');
      html += `
        <div style="display: flex; justify-content: space-between; font-style: italic; color: #475569; font-size: 10px; margin-bottom: 6px;">
          <span>${parts[0].trim()}</span>
          <span>${parts[1].trim()}</span>
        </div>
      `;
      return;
    }

    // Bullet Points
    if (line.startsWith('•') || line.startsWith('-')) {
      html += `<div style="margin-left: 10px; margin-bottom: 4px; position: relative; padding-left: 15px; font-size: 10.5px; color: #334155;">
        <span style="position: absolute; left: 0; color: ${accentBlue}; font-weight: 900;">•</span>
        ${line.substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </div>`;
      return;
    }

    // Bold text in paragraphs
    const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');
    html += `<p style="margin-bottom: 6px; text-align: justify; font-size: 10.5px; color: #334155; line-height: 1.6;">${formattedLine}</p>`;
  });

  element.innerHTML = `<div style="background: white;">${html}</div>`;
  
  document.body.appendChild(element);
  try {
    const canvas = await html2canvas(element, { 
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const totalImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = totalImgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - totalImgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
  } finally {
    document.body.removeChild(element);
  }
}
