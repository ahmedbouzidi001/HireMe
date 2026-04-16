import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, CreditCard, Zap, Shield, Star, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

export function PremiumPage({ t }: { t: (p: string) => string }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    // In a real app, you would call your backend to create a Checkout Session
    // and then redirect to Stripe.
    // For this demo, we'll just simulate a delay and show an alert or redirect to a mock success page.
    setTimeout(() => {
      setLoading(false);
      alert(`Redirection vers Stripe pour le plan ${plan}... (Simulation)`);
    }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Passez à la vitesse supérieure
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Débloquez toutes les fonctionnalités de HireMe.ai et multipliez vos chances de trouver le job de vos rêves.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        {/* Free Plan */}
        <div className="glass-card p-8 flex flex-col relative overflow-hidden">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Basique</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">0€</span>
              <span className="text-slate-500">/mois</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Pour commencer votre recherche d'emploi.</p>
          </div>
          
          <ul className="mt-8 space-y-4 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-brand-primary" /> 3 analyses de CV par mois
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-brand-primary" /> Recherche d'emploi basique
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-brand-primary" /> Génération de lettre de motivation (limité)
            </li>
          </ul>

          <button className="btn-secondary w-full mt-8" disabled>
            Plan Actuel
          </button>
        </div>

        {/* Premium Plan */}
        <div className="glass-card p-8 flex flex-col relative overflow-hidden border-brand-primary/50 shadow-2xl shadow-brand-primary/20">
          <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
            Recommandé
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4 relative z-10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Premium <Star size={20} className="text-amber-400 fill-amber-400" />
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">19€</span>
              <span className="text-slate-500">/mois</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">L'arsenal complet pour décrocher votre job.</p>
          </div>
          
          <ul className="mt-8 space-y-4 flex-1 relative z-10">
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <Check size={18} className="text-brand-primary" /> Analyses de CV illimitées
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <Check size={18} className="text-brand-primary" /> Candidatures automatiques (jusqu'à 50/mois)
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <Check size={18} className="text-brand-primary" /> Accès au Coach IA en illimité
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <Check size={18} className="text-brand-primary" /> Optimisation LinkedIn avancée
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <Check size={18} className="text-brand-primary" /> Support prioritaire
            </li>
          </ul>

          <button 
            onClick={() => handleSubscribe('premium')} 
            disabled={loading}
            className="btn-primary w-full mt-8 flex items-center justify-center gap-2 relative z-10"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CreditCard size={18} />}
            S'abonner maintenant
          </button>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Shield size={24} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white">Paiement Sécurisé</h4>
          <p className="text-xs text-slate-500">Transactions sécurisées par Stripe, leader mondial du paiement en ligne.</p>
        </div>
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
            <Zap size={24} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white">Accès Immédiat</h4>
          <p className="text-xs text-slate-500">Débloquez toutes les fonctionnalités instantanément après le paiement.</p>
        </div>
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Star size={24} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white">Sans Engagement</h4>
          <p className="text-xs text-slate-500">Annulez votre abonnement à tout moment en un seul clic.</p>
        </div>
      </div>
    </motion.div>
  );
}
