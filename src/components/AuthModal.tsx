import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, LogOut, AlertCircle } from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

export function AuthModal({ isOpen, onClose, t }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const getErrorMessage = (err: any) => {
    const code = err?.code || '';
    const message = err?.message || '';
    
    if (code === 'auth/popup-closed-by-user') {
      return t('auth.popup_closed') || 'Authentification annulée';
    }
    if (code === 'auth/popup-blocked') {
      return t('auth.popup_blocked') || 'Pop-up bloquée. Vérifiez les paramètres du navigateur';
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
      googleProvider.setCustomParameters({ prompt: 'select_account' });
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

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-white/10 backdrop-blur-3xl"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">
                  {isSignUp ? t('auth.signup_title') || 'Créer un compte' : t('auth.login_title') || 'Connexion'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isSignUp ? t('auth.signup_desc') || 'Rejoignez HireMe.ai' : t('auth.login_desc') || 'Accédez à votre profil'}
                </p>
              </div>

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

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-gradient-to-br from-bg-card via-bg-card to-bg-elevated text-slate-400 font-medium uppercase tracking-wider">{t('auth.or_email') || 'Ou avec email'}</span></div>
              </div>

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
