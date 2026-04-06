import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
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
  Timestamp
} from 'firebase/firestore';
import { 
  Target, 
  Loader2, 
  Plus, 
  FileText, 
  Search, 
  LogOut, 
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
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import { auth, db, googleProvider } from './lib/firebase';
import { cn } from './lib/utils';
import { 
  analyzeProfile, 
  searchJobs, 
  scoreJobMatch, 
  generateTargetedDocument, 
  getCareerCoachReport,
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur est survenue.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error?.includes("insufficient permissions")) {
          errorMessage = "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Oups !</h2>
            <p className="text-slate-400">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Component ---

export default function App() {
  const [session, setSession] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'applications' | 'coach' | 'profile' | 'settings' | 'recruiter'>('dashboard');

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
        setProfile(docSnap.data() as UserProfile);
        setIsOnboarded(true);
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
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <LandingPage onLogin={handleGoogleLogin} loading={authLoading} />
      </ErrorBoundary>
    );
  }

  if (!isOnboarded) {
    return (
      <ErrorBoundary>
        <Onboarding session={session} onComplete={() => setIsOnboarded(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-dark flex flex-col md:flex-row">
        <nav className="w-full md:w-64 bg-bg-card border-b md:border-b-0 md:border-r border-border-muted p-4 flex flex-col">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white">
              <Target size={18} />
            </div>
            <span className="text-xl font-bold text-white">HireMe.ai</span>
          </div>

          <div className="flex-1 space-y-2">
            <NavButton 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<TrendingUp size={20} />}
              label="Tableau de bord"
            />
            <NavButton 
              active={activeTab === 'jobs'} 
              onClick={() => setActiveTab('jobs')}
              icon={<Search size={20} />}
              label="Recherche d'emploi"
            />
            <NavButton 
              active={activeTab === 'applications'} 
              onClick={() => setActiveTab('applications')}
              icon={<History size={20} />}
              label="Mes candidatures"
            />
            <NavButton 
              active={activeTab === 'coach'} 
              onClick={() => setActiveTab('coach')}
              icon={<Sparkles size={20} />}
              label="Coach AI"
            />
            <NavButton 
              active={activeTab === 'recruiter'} 
              onClick={() => setActiveTab('recruiter')}
              icon={<Briefcase size={20} />}
              label="Espace Recruteur"
            />
            <NavButton 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={<UserIcon size={20} />}
              label="Mon Profil"
            />
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Globe size={20} />}
              label="Paramètres"
            />
          </div>

          <div className="pt-4 border-t border-border-muted">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard profile={profile!} />}
            {activeTab === 'jobs' && <JobSearch profile={profile!} />}
            {activeTab === 'applications' && <Applications session={session} />}
            {activeTab === 'coach' && <Coach profile={profile!} />}
            {activeTab === 'profile' && <ProfilePage profile={profile!} />}
            {activeTab === 'settings' && <SettingsPage profile={profile!} />}
            {activeTab === 'recruiter' && <RecruiterPage />}
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
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function LandingPage({ onLogin, loading }: { onLogin: () => void, loading: boolean }) {
  return (
    <div className="min-h-screen bg-bg-dark text-white overflow-x-hidden">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <Target size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight">HireMe.ai</span>
        </div>
        <button onClick={onLogin} className="btn-secondary px-6">Connexion</button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-sm font-bold">
              <Rocket size={14} className="animate-float" />
              <span>Propulsé par Gemini 2.0 Flash</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Trouvez votre emploi idéal avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">l'IA</span>.
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-lg">
              Uploadez votre CV une seule fois. HireMe.ai analyse automatiquement les offres, génère des CV ciblés et vous coache pour réussir vos entretiens.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onLogin} disabled={loading} className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    Commencer gratuitement
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
              <div className="flex items-center gap-4 px-4">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-dark bg-slate-800" />
                  ))}
                </div>
                <p className="text-sm text-slate-500">Rejoint par +500 candidats</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 blur-3xl rounded-full" />
            <div className="relative glass-card border-white/10 p-2 overflow-hidden shadow-2xl">
              <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto">
                    <TrendingUp size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">92% Match ATS</p>
                    <p className="text-slate-400">Consultant Odoo Senior</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Zap className="text-yellow-500" />}
            title="Analyse Instantanée"
            desc="L'IA extrait vos compétences et expériences de votre CV en quelques secondes."
          />
          <FeatureCard 
            icon={<Target className="text-brand-primary" />}
            title="Matching Intelligent"
            desc="Recevez un score de compatibilité pour chaque offre d'emploi trouvée sur le web."
          />
          <FeatureCard 
            icon={<FileText className="text-brand-secondary" />}
            title="Documents Ciblés"
            desc="Générez des CV et lettres de motivation optimisés pour chaque poste spécifique."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card space-y-4 hover:border-white/20 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Onboarding({ session, onComplete }: { session: User, onComplete: () => void }) {
  const [mode, setMode] = useState<'choice' | 'import' | 'form'>('choice');
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
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
      alert("Erreur lors de la lecture du PDF. Veuillez copier-coller le texte manuellement.");
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
          <h2 className="text-xl font-bold text-white">
            {uploading ? "Lecture du PDF..." : "Analyse de votre profil en cours..."}
          </h2>
          <p className="text-slate-400">Notre IA extrait vos compétences et expériences.</p>
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
        {mode === 'choice' && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Bienvenue sur HireMe.ai</h1>
              <p className="text-slate-400 text-lg">Comment souhaitez-vous configurer votre profil ?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="p-6 h-full rounded-xl border border-border-muted bg-slate-800/50 group-hover:border-brand-primary group-hover:bg-brand-primary/5 transition-all text-left space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                    <DownloadCloud size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Importer mon CV (PDF)</h3>
                  <p className="text-slate-400 text-sm">L'IA extraira automatiquement vos informations depuis votre fichier.</p>
                </div>
              </div>
              <button 
                onClick={() => setMode('import')}
                className="p-6 rounded-xl border border-border-muted bg-slate-800/50 hover:border-brand-secondary hover:bg-brand-secondary/5 transition-all text-left space-y-3 group"
              >
                <div className="w-12 h-12 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Copier-coller le texte</h3>
                <p className="text-slate-400 text-sm">Si vous n'avez pas de PDF, collez simplement le texte de votre CV.</p>
              </button>
            </div>
            <button onClick={() => setMode('form')} className="text-slate-500 hover:text-white text-sm underline transition-colors">
              Ou remplir manuellement →
            </button>
          </div>
        )}

        {mode === 'import' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setMode('choice')} className="text-slate-400 hover:text-white">
                <ChevronRight className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-white">Collez le texte de votre CV</h2>
            </div>
            <textarea 
              className="input-field min-h-[300px] font-mono text-sm"
              placeholder="Copiez et collez ici le contenu textuel de votre CV..."
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />
            <button 
              disabled={!cvText.trim()}
              onClick={() => handleProcessCV(cvText)}
              className="btn-primary w-full"
            >
              Analyser mon CV
            </button>
          </div>
        )}

        {mode === 'form' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white">Bientôt disponible</h2>
            <p className="text-slate-400 mt-2">La saisie manuelle arrive très prochainement.</p>
            <button onClick={() => setMode('choice')} className="btn-secondary mt-6">Retour</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Dashboard({ profile }: { profile: UserProfile }) {
  const [stats, setStats] = useState({ applications: 0, avgScore: 0 });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'applications'), where('user_id', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStats({
        applications: snapshot.size,
        avgScore: profile.employability_score
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications'));
    return unsubscribe;
  }, [profile.employability_score]);

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
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Bonjour, {profile.name?.split(' ')[0] || 'Candidat'} 👋</h1>
          <p className="text-slate-400 font-medium">Prêt à décrocher votre prochain job ? Voici votre état des lieux.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-2xl border border-border-muted">
            <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse"></div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Market Analysis</span>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))} className="btn-primary flex items-center gap-2 shadow-xl shadow-brand-primary/20">
            <Search size={18} /> Explorer les offres
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<History className="text-blue-500" />} 
          label="Candidatures" 
          value={stats.applications.toString()} 
          sub="Documents générés"
          trend="+3 cette semaine"
        />
        <StatCard 
          icon={<Target className="text-brand-primary" />} 
          label="Score moyen" 
          value={`${stats.avgScore}%`} 
          sub="Match ATS"
          trend="Top 5% mondial"
        />
        <StatCard 
          icon={<TrendingUp className="text-brand-secondary" />} 
          label="Progression" 
          value="+12%" 
          sub="Ce mois-ci"
          trend="En hausse"
        />
        <StatCard 
          icon={<Briefcase className="text-amber-500" />} 
          label="Offres vues" 
          value="42" 
          sub="Dernières 24h"
          trend="Activité intense"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Completion */}
          <div className="glass-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-primary/10 transition-all"></div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-800" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-secondary" strokeWidth="3" strokeDasharray={`${completion}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black text-white">{completion}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h3 className="text-xl font-bold text-white">Complétez votre profil</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Un profil complété à 100% augmente vos chances d'être repéré par les recruteurs de <strong>3.5x</strong>.</p>
                <div className="pt-2">
                  <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'profile' }))} className="text-brand-secondary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mx-auto md:mx-0">
                    Optimiser mon profil <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-amber-500 w-5 h-5" />
                Gaps identifiés
              </h3>
              <div className="space-y-3">
                {profile.top_gaps?.slice(0, 3).map((gap, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-border-muted space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{gap.gap}</span>
                      <span className="badge bg-amber-500/10 text-amber-500 border-amber-500/20">{gap.priority}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{gap.action}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-brand-secondary w-5 h-5" />
                Compétences clés
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.slice(0, 10).map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-800/50 text-slate-300 text-[10px] font-bold border border-border-muted">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card space-y-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="text-brand-primary" size={20} />
              Résumé du profil
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed italic">"{profile.profile_summary}"</p>
            <div className="pt-4 border-t border-border-muted">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                <span>Positionnement</span>
                <span className="text-brand-primary">Elite</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{profile.market_positioning}</p>
            </div>
          </div>

          <div className="glass-card bg-brand-primary/5 border-brand-primary/20">
            <h3 className="font-bold text-white flex items-center gap-2 mb-2">
              <Rocket size={20} className="text-brand-primary" />
              HireMe Elite
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Débloquez l'IA de niveau 4 pour des candidatures 100% automatisées et un accès prioritaire aux offres.</p>
            <button className="w-full btn-primary py-2 text-xs">En savoir plus</button>
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
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && <span className="text-[10px] font-bold text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-3xl font-black text-white">{value}</h4>
        <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

function JobSearch({ profile }: { profile: UserProfile }) {
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
      <div className="glass-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Poste</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input className="input-field pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Localisation</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input className="input-field pl-10" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search size={18} />}
              Rechercher
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
            <p className="text-slate-400">Recherche d'offres en cours...</p>
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job, i) => <JobCard key={i} job={job} profile={profile} />)
        ) : (
          <div className="py-20 text-center glass-card">
            <p className="text-slate-400">Aucune offre trouvée pour cette recherche.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function JobCard({ job, profile }: { job: JobOffer, profile: UserProfile }) {
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleScore = async () => {
    if (atsResult) return;
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

  return (
    <div className="glass-card hover:border-brand-primary/50 transition-all group">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white group-hover:text-brand-primary transition-colors">{job.title}</h3>
            <span className="badge bg-slate-800 text-slate-400 border border-border-muted">{job.source}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1"><Briefcase size={14} /><span>{job.company}</span></div>
            <div className="flex items-center gap-1"><MapPin size={14} /><span>{job.location}</span></div>
            <div className="flex items-center gap-1"><History size={14} /><span>{job.posted_at}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {atsResult ? (
            <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-2 border border-border-muted">
              <div className="text-center px-3 border-r border-border-muted">
                <div className={cn("text-lg font-bold", atsResult.ats_score >= 80 ? "text-brand-secondary" : atsResult.ats_score >= 60 ? "text-amber-500" : "text-red-500")}>
                  {atsResult.ats_score}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Match ATS</div>
              </div>
              <button onClick={() => setShowDetails(!showDetails)} className="text-slate-400 hover:text-white p-1">
                <ChevronRight className={cn("transition-transform", showDetails && "rotate-90")} />
              </button>
            </div>
          ) : (
            <button onClick={handleScore} disabled={loading} className="btn-secondary text-sm py-2 flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}
              Scorer avec l'IA
            </button>
          )}
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 flex items-center gap-2">
            Postuler <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <AnimatePresence>
        {showDetails && atsResult && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-6 mt-6 border-t border-border-muted space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle className="text-brand-secondary w-4 h-4" />Mots-clés matchés</h4>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.matched_keywords?.map((kw, i) => <span key={i} className="px-2 py-1 rounded bg-brand-secondary/10 text-brand-secondary text-[10px] border border-brand-secondary/20">{kw}</span>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><AlertCircle className="text-red-500 w-4 h-4" />Mots-clés manquants</h4>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.missing_keywords?.map((kw, i) => <span key={i} className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] border border-red-500/20">{kw}</span>)}
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-border-muted">
                <h4 className="text-sm font-bold text-white mb-2">Recommandation HireMe</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{atsResult.recommendation}</p>
              </div>
              <div className="flex justify-end gap-3">
                <GenerateDocButton type="cv" job={job} profile={profile} />
                <GenerateDocButton type="cover_letter" job={job} profile={profile} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerateDocButton({ type, job, profile }: { type: 'cv' | 'cover_letter', job: JobOffer, profile: UserProfile }) {
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
        <DownloadCloud size={14} /> Télécharger {type === 'cv' ? 'CV' : 'LM'}
      </button>
    );
  }

  return (
    <button onClick={handleGenerate} disabled={loading} className="btn-secondary text-xs py-1.5 flex items-center gap-2">
      {loading ? <Loader2 className="animate-spin w-3 h-3" /> : <Plus size={14} />} Générer {type === 'cv' ? 'CV' : 'LM'}
    </button>
  );
}

function Applications({ session }: { session: User }) {
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

  const filteredApps = apps.filter(app => filter === 'all' || app.type === filter);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes candidatures</h1>
          <p className="text-slate-400">Gérez vos documents et suivez vos envois.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-border-muted">
            <button onClick={() => setFilter('all')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", filter === 'all' ? "bg-brand-primary text-white" : "text-slate-400 hover:text-white")}>Tout</button>
            <button onClick={() => setFilter('cv')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", filter === 'cv' ? "bg-brand-primary text-white" : "text-slate-400 hover:text-white")}>CVs</button>
            <button onClick={() => setFilter('cover_letter')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", filter === 'cover_letter' ? "bg-brand-primary text-white" : "text-slate-400 hover:text-white")}>Lettres</button>
          </div>
          <button onClick={() => setShowManualModal(true)} className="btn-secondary flex items-center gap-2">
            <Plus size={18} /> Ajouter
          </button>
        </div>
      </header>

      {showManualModal && (
        <ManualApplicationModal onClose={() => setShowManualModal(false)} session={session} />
      )}

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="glass-card flex items-center justify-between group hover:border-brand-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", 
                  app.type === 'cv' ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-secondary/10 text-brand-secondary"
                )}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-brand-primary transition-colors">{app.jobTitle}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    <span>{app.company}</span>
                    <span>•</span>
                    <span>{new Date(app.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadAsPDF(app.content, `${app.type}_${app.company}`)} 
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-border-muted"
                  title="Télécharger PDF"
                >
                  <Download size={20} />
                </button>
                <a 
                  href={app.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all border border-transparent hover:border-brand-primary/20"
                  title="Voir l'offre"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass-card border-dashed">
          <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold text-slate-300">Aucun document trouvé</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">Commencez par rechercher des offres et générer des documents personnalisés.</p>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'jobs' }))} className="btn-primary mt-6">Rechercher des jobs</button>
        </div>
      )}
    </motion.div>
  );
}

function Coach({ profile }: { profile: UserProfile }) {
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Coach AI</h1>
          <p className="text-slate-400">Analyse hebdomadaire et conseils stratégiques.</p>
        </div>
        <button 
          onClick={handleGenerateReport} 
          disabled={loading} 
          className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-primary/20"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={18} />} 
          Générer mon rapport
        </button>
      </header>

      {report ? (
        <div className="glass-card p-8">
          <div className="prose prose-invert max-w-none prose-headings:text-brand-primary prose-strong:text-white prose-p:text-slate-300">
            <Markdown>{report}</Markdown>
          </div>
          <div className="mt-8 pt-8 border-t border-border-muted flex justify-between items-center">
            <p className="text-xs text-slate-500 italic">Rapport généré le {new Date().toLocaleDateString()}</p>
            <button onClick={() => setReport(null)} className="text-xs text-slate-400 hover:text-white underline">Nouveau rapport</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card py-20 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center text-brand-primary mx-auto shadow-xl">
              <Sparkles size={48} />
            </div>
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-2xl font-bold text-white">Prêt pour votre coaching ?</h3>
              <p className="text-slate-400 leading-relaxed">Notre IA analyse votre profil et vos {apps.length} candidatures récentes pour vous donner un plan d'action concret et optimiser vos chances.</p>
            </div>
            <button onClick={handleGenerateReport} disabled={loading} className="btn-primary px-10 py-3 text-lg">Commencer l'analyse</button>
          </div>
          <div className="space-y-6">
            <div className="glass-card border-amber-500/20 bg-amber-500/5">
              <h4 className="font-bold text-amber-500 flex items-center gap-2 mb-2">
                <AlertCircle size={18} />
                Conseil du jour
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Les recruteurs passent en moyenne 6 secondes sur un CV. Assurez-vous que vos 3 compétences clés sont visibles dès le premier coup d'œil.
              </p>
            </div>
            <div className="glass-card border-brand-secondary/20 bg-brand-secondary/5">
              <h4 className="font-bold text-brand-secondary flex items-center gap-2 mb-2">
                <Rocket size={18} />
                Objectif de la semaine
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Postulez à au moins 3 offres avec un score ATS supérieur à 80% pour maximiser vos chances de réponse.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ProfilePage({ profile }: { profile: UserProfile }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-brand-primary/20">
            {profile.name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{profile.name || 'Profil Incomplet'}</h1>
            <p className="text-slate-400 flex items-center gap-2 mt-1">
              <Briefcase size={16} className="text-brand-primary" />
              {profile.target_role} • {profile.location}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <Mail size={14} className="text-slate-600" /> {profile.email}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <Phone size={14} className="text-slate-600" /> {profile.phone}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5">
            <Edit3 size={18} /> Modifier le profil
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'applications' }))} className="btn-primary flex items-center gap-2">
            <FileText size={18} /> Mes Documents
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Résumé */}
          <div className="glass-card relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UserIcon size={20} className="text-brand-primary" />
              Résumé Professionnel
            </h3>
            <p className="text-slate-300 leading-relaxed text-lg font-medium italic">"{profile.profile_summary}"</p>
          </div>

          {/* Expériences */}
          <div className="glass-card space-y-8">
            <h3 className="text-xl font-bold text-white border-b border-border-muted pb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-brand-primary" />
              Expériences Professionnelles
            </h3>
            <div className="space-y-10 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {profile.experiences?.map((exp, i) => (
                <div key={i} className="relative pl-10 group">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-brand-primary z-10 group-hover:scale-125 transition-transform"></div>
                  <div className="space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h4 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">{exp.role}</h4>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">{exp.period}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><Building2 size={14} /> {exp.company}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {exp.location}</span>
                    </div>
                    <ul className="space-y-2 mt-4">
                      {exp.description.map((desc, j) => (
                        <li key={j} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-brand-secondary mt-1.5">•</span>
                          {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formation */}
          <div className="glass-card space-y-8">
            <h3 className="text-xl font-bold text-white border-b border-border-muted pb-4 flex items-center gap-2">
              <GraduationCap size={20} className="text-brand-secondary" />
              Formation Académique
            </h3>
            <div className="space-y-8">
              {profile.education?.map((edu, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-all shrink-0 shadow-lg">
                    <GraduationCap size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <h4 className="text-lg font-bold text-white">{edu.degree}</h4>
                      <span className="text-xs font-bold text-slate-500">{edu.period}</span>
                    </div>
                    <p className="text-brand-secondary font-medium">{edu.school} • {edu.location}</p>
                    <p className="text-slate-400 text-sm mt-2">{edu.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Score Card */}
          <div className="glass-card text-center space-y-6 bg-gradient-to-b from-bg-card to-brand-primary/5">
            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Score d'Employabilité</h3>
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-800" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-primary" strokeWidth="3" strokeDasharray={`${profile.employability_score}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{profile.employability_score}%</span>
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter">Elite Profile</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed px-4">Votre profil est classé dans le top 5% des candidats pour le poste de <strong>{profile.target_role}</strong>.</p>
          </div>

          {/* Compétences */}
          <div className="glass-card space-y-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Cpu size={20} className="text-brand-primary" />
              Expertise Technique
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.map((s, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-800/50 text-slate-200 text-xs font-bold border border-border-muted hover:border-brand-primary/50 transition-colors cursor-default">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <div className="glass-card space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                Certifications
              </h3>
              <div className="space-y-3">
                {profile.certifications.map((cert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-border-muted">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-sm text-slate-300 font-medium">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          <div className="glass-card space-y-4 border-amber-500/20 bg-amber-500/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-amber-500 w-5 h-5" />
              Axes d'Amélioration
            </h3>
            <div className="space-y-3">
              {profile.top_gaps?.map((gap, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-border-muted space-y-2 group hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{gap.gap}</span>
                    <span className={cn(
                      "badge",
                      gap.priority === 'high' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                    )}>{gap.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{gap.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsPage({ profile }: { profile: UserProfile }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-slate-400">Gérez votre compte et vos préférences.</p>
      </header>

      <div className="space-y-6">
        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="text-brand-primary" size={20} />
            Compte & Sécurité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <input className="input-field opacity-50" value={auth.currentUser?.email || ''} readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">ID Utilisateur</label>
              <input className="input-field opacity-50" value={auth.currentUser?.uid || ''} readOnly />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-secondary" size={20} />
            Abonnement
          </h3>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-2xl font-bold text-white">Plan Gratuit</h4>
              <p className="text-slate-400">Accès limité aux fonctionnalités de base.</p>
            </div>
            <button className="btn-primary px-8">Passer à Elite</button>
          </div>
        </section>

        <section className="glass-card space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            Zone de danger
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-white">Supprimer mon compte</h4>
              <p className="text-xs text-slate-500">Cette action est irréversible et supprimera toutes vos données.</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
              Supprimer
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function RecruiterPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Espace Recruteur B2B</h1>
          <p className="text-slate-400">Gérez vos offres et trouvez les meilleurs talents.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Publier une offre
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<UserIcon className="text-brand-primary" />} label="Candidats actifs" value="1,284" sub="Sur la plateforme" />
        <StatCard icon={<Briefcase className="text-brand-secondary" />} label="Offres publiées" value="12" sub="Ce mois-ci" />
        <StatCard icon={<TrendingUp className="text-amber-500" />} label="Taux de match" value="84%" sub="Moyenne globale" />
      </div>

      <div className="glass-card py-20 text-center space-y-6 border-dashed">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
          <ShieldCheck size={40} />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-bold text-white">Accès restreint</h3>
          <p className="text-slate-400">L'interface recruteur complète est réservée aux comptes entreprises vérifiés.</p>
        </div>
        <button className="btn-secondary">Demander une démo</button>
      </div>
    </motion.div>
  );
}

function ManualApplicationModal({ onClose, session }: { onClose: () => void, session: User }) {
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
          <h3 className="text-xl font-bold text-white">Ajouter une candidature</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Poste</label>
            <input required className="input-field" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="ex: Développeur Fullstack" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Entreprise</label>
            <input required className="input-field" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="ex: Google" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Lien de l'offre (optionnel)</label>
            <input className="input-field" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Enregistrer"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

async function downloadAsPDF(content: string, filename: string) {
  const element = document.createElement('div');
  // A4 dimensions in pixels at 96 DPI: 794px x 1123px
  // We use 800px for a bit more room, then scale
  element.style.width = '794px';
  element.style.padding = '40px 50px';
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#1a1a1a';
  element.style.fontFamily = '"Inter", "Helvetica", "Arial", sans-serif';
  element.style.lineHeight = '1.45';
  element.style.fontSize = '11.5px';
  element.style.boxSizing = 'border-box';
  
  const brandBlue = '#1e3a8a'; // Deep professional blue
  const accentBlue = '#3b82f6';

  const lines = content.split('\n');
  let html = '';
  let inHeader = true;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed && !inHeader) {
      html += '<div style="height: 6px;"></div>';
      return;
    }

    // Header Parsing
    if (line.startsWith('# ')) {
      html += `<h1 style="font-size: 26px; font-weight: 800; color: ${brandBlue}; text-align: center; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 1px;">${line.replace('# ', '')}</h1>`;
      return;
    }
    if (line.startsWith('## ')) {
      html += `<h2 style="font-size: 15px; font-weight: 600; color: ${accentBlue}; text-align: center; margin-bottom: 4px;">${line.replace('## ', '')}</h2>`;
      return;
    }
    if (line.startsWith('### ')) {
      html += `<h3 style="font-size: 11px; font-weight: 500; color: #4b5563; text-align: center; margin-bottom: 6px;">${line.replace('### ', '')}</h3>`;
      return;
    }
    if (inHeader && (trimmed.includes('|') || trimmed.includes('@') || trimmed.includes('linkedin'))) {
      html += `<div style="font-size: 10px; color: #6b7280; text-align: center; margin-bottom: 18px; border-bottom: 1px solid #e5e7eb; pb-4">${trimmed}</div>`;
      inHeader = false;
      return;
    }

    // Section Parsing
    if (line.startsWith('--- ') && line.endsWith(' ---')) {
      const title = line.replace(/---/g, '').trim();
      html += `
        <div style="margin-top: 16px; margin-bottom: 8px; border-bottom: 1.5px solid ${brandBlue};">
          <h2 style="font-size: 13px; font-weight: 700; color: ${brandBlue}; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h2>
        </div>
      `;
      return;
    }

    // Experience / Education Parsing (Title | Date)
    if (line.startsWith('**') && line.includes('|')) {
      const parts = line.replace(/\*\*/g, '').split('|');
      html += `
        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #111827; margin-top: 10px; font-size: 12px;">
          <span>${parts[0].trim()}</span>
          <span style="color: ${brandBlue}; font-size: 10.5px;">${parts[1].trim()}</span>
        </div>
      `;
      return;
    }

    // Company / Location Parsing (*Company* | Location)
    if (line.startsWith('*') && line.includes('|')) {
      const parts = line.replace(/\*/g, '').split('|');
      html += `
        <div style="display: flex; justify-content: space-between; font-style: italic; color: #4b5563; font-size: 10.5px; margin-bottom: 4px;">
          <span>${parts[0].trim()}</span>
          <span>${parts[1].trim()}</span>
        </div>
      `;
      return;
    }

    // Bullet Points
    if (line.startsWith('•') || line.startsWith('-')) {
      html += `<div style="margin-left: 12px; margin-bottom: 2px; position: relative; padding-left: 12px; font-size: 11px; color: #374151;">
        <span style="position: absolute; left: 0; color: ${accentBlue}; font-weight: bold;">•</span>
        ${line.substring(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </div>`;
      return;
    }

    // Bold text in paragraphs
    const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #000;">$1</strong>');
    html += `<p style="margin-bottom: 5px; text-align: justify; font-size: 11px; color: #374151;">${formattedLine}</p>`;
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
