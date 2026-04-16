import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export interface Experience {
  role: string;
  company: string;
  location: string;
  period: string;
  description: string[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  period: string;
  details: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  target_role: string;
  role_type?: 'candidate' | 'recruiter';
  experience_years: number;
  skills: string[];
  languages: string[];
  experiences: Experience[];
  education: Education[];
  certifications: string[];
  interests: string[];
  cv_raw_text: string;
  employability_score: number;
  profile_summary: string;
  top_gaps: { gap: string; action: string; priority: 'high' | 'medium' | 'low' }[];
  market_positioning: string;
}

export interface JobOffer {
  id: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  posted_at: string;
}

export interface ATSResult {
  ats_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  recommendation: string;
  apply_recommendation: boolean;
}

/**
 * FONCTION 1 : ANALYSER_PROFIL
 * Extrait les compétences, calcule le score d'employabilité et identifie les gaps.
 */
export async function analyzeProfile(cvText: string): Promise<UserProfile> {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tu es un expert RH spécialisé dans le marché tunisien et international. 
    Analyse ce CV et extrait les informations structurées.
    
    RÈGLES DE CALCUL DU SCORE (0-100):
    - Complétude du profil (25%)
    - Certifications reconnues (25%)
    - Résultats chiffrés dans le CV (25%)
    - Compétences demandées sur le marché tunisien actuellement (25%)

    CV TEXT:
    ${cvText}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          location: { type: Type.STRING },
          target_role: { type: Type.STRING },
          experience_years: { type: Type.NUMBER },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          languages: { type: Type.ARRAY, items: { type: Type.STRING } },
          experiences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                period: { type: Type.STRING },
                description: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                school: { type: Type.STRING },
                location: { type: Type.STRING },
                period: { type: Type.STRING },
                details: { type: Type.STRING }
              }
            }
          },
          certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          employability_score: { type: Type.NUMBER },
          profile_summary: { type: Type.STRING },
          top_gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                gap: { type: Type.STRING },
                action: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
              }
            }
          },
          market_positioning: { type: Type.STRING }
        },
        required: ["name", "email", "skills", "experiences", "education", "employability_score", "profile_summary", "top_gaps"]
      }
    }
  });

  const profile = JSON.parse(response.text || "{}");
  return {
    ...profile,
    cv_raw_text: cvText
  };
}

/**
 * FONCTION 2 : RECHERCHER_OFFRES
 * Utilise Google Search pour trouver des offres réelles si les clés API ne sont pas là,
 * ou simule l'appel aux APIs JSearch/Adzuna.
 */
export async function searchJobs(role: string, location: string): Promise<JobOffer[]> {
  const ai = getGeminiModel();
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Trouve des offres d'emploi réelles et récentes pour le poste de "${role}" à "${location}".
    Utilise des sources fiables comme LinkedIn, Indeed, Tanitjobs, Rekrute.
    Tu DOIS extraire les informations et les retourner sous forme d'une liste d'objets JSON.
    Chaque offre doit avoir un titre, une entreprise, un lieu, une description courte, une URL directe et la source.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            external_id: { type: Type.STRING },
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            description: { type: Type.STRING },
            url: { type: Type.STRING },
            source: { type: Type.STRING },
            posted_at: { type: Type.STRING }
          },
          required: ["title", "company", "url", "source"]
        }
      }
    }
  });

  try {
    const text = response.text || "[]";
    // The model might still wrap it in markdown or something if it's not perfectly following JSON mode
    // but with responseMimeType: "application/json", it should be clean.
    const cleanJson = text.trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse jobs JSON:", response.text);
    // Fallback parsing if JSON mode failed for some reason
    try {
      const text = response.text || "";
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      }
    } catch (innerE) {
      console.error("Inner fallback parsing failed:", innerE);
    }
    return [];
  }
}

/**
 * FONCTION 3 : SCORER_MATCH_ATS
 * Compare un profil avec une offre spécifique.
 */
export async function scoreJobMatch(profile: UserProfile, job: JobOffer): Promise<ATSResult> {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyse le match entre ce candidat et cette offre d'emploi.
    
    CANDIDAT:
    ${JSON.stringify(profile)}
    
    OFFRE:
    ${JSON.stringify(job)}
    
    CALCUL DU SCORE (0-100):
    - Keywords techniques matchés : 40%
    - Niveau d'expérience requis vs disponible : 30%
    - Localisation compatible : 15%
    - Langue requise disponible : 15%
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ats_score: { type: Type.NUMBER },
          matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING },
          apply_recommendation: { type: Type.BOOLEAN }
        },
        required: ["ats_score", "matched_keywords", "missing_keywords", "recommendation"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

/**
 * FONCTION 4 & 5 : GENERER_DOCUMENTS
 * Génère un CV ou une LM ciblée.
 */
export async function generateTargetedDocument(
  type: 'cv' | 'cover_letter' | 'spontaneous',
  profile: UserProfile,
  job?: JobOffer,
  language: 'fr' | 'en' | 'ar' = 'fr'
): Promise<string> {
  const ai = getGeminiModel();
  
  let prompt = "";
  if (type === 'cv') {
    prompt = `Génère un CV EXTRAORDINAIRE, stratégique et moderne pour le poste de ${job?.title} chez ${job?.company}.
    Langue: ${language}.
    
    OBJECTIF : Le candidat doit paraître comme la solution idéale au problème de l'entreprise.
    
    STRUCTURE ET FORMATAGE STRICTS (Utilise ce format exact pour le parsing) :
    
    # [NOM COMPLET DU CANDIDAT]
    ## [TITRE PROFESSIONNEL CIBLÉ]
    ### [SPÉCIALITÉ 1] • [SPÉCIALITÉ 2] • [SPÉCIALITÉ 3] • [SPÉCIALITÉ 4]
    [VILLE, PAYS] | [TÉLÉPHONE] | [EMAIL] | [LINKEDIN URL]
    
    --- PROPOSITION DE VALEUR ---
    [Un paragraphe de 4 lignes maximum expliquant POURQUOI le candidat est l'expert idéal pour ce poste spécifique, en mentionnant des outils clés et des résultats concrets.]
    
    --- EXPÉRIENCES PROFESSIONNELLES ---
    [Pour chaque expérience pertinente :]
    **[TITRE DU POSTE]** | [DATES : MOIS ANNÉE – MOIS ANNÉE ou PRÉSENT]
    *[NOM DE L'ENTREPRISE]* | [VILLE, PAYS]
    • [Réalisation majeure 1 avec CHIFFRES : ex: +20% de productivité, -15% de coûts]
    • [Réalisation majeure 2 avec CHIFFRES : ex: Automatisation de 10+ processus]
    • [Réalisation majeure 3 avec CHIFFRES : ex: Gestion d'un budget de X€]
    
    --- FORMATION ACADÉMIQUE ---
    **[NOM DU DIPLÔME]** | [ANNÉES]
    *[NOM DE L'ÉCOLE/UNIVERSITÉ]* | [VILLE, PAYS]
    • [Spécialisation ou projet majeur en lien avec le poste]
    
    --- MATRICE DE COMPÉTENCES ---
    • **[CATÉGORIE 1 (ex: ERP & SI)]**: [Compétence 1], [Compétence 2], ...
    • **[CATÉGORIE 2 (ex: DATA & BI)]**: [Compétence 1], [Compétence 2], ...
    • **[CATÉGORIE 3 (ex: AUTOMATISATION)]**: [Compétence 1], [Compétence 2], ...
    
    --- CERTIFICATIONS ---
    [Liste des certifications séparées par des points médians •]
    
    --- LANGUES ---
    [Langue 1] ([Niveau]) • [Langue 2] ([Niveau])
    
    --- CENTRES D'INTÉRÊT ---
    [Liste des centres d'intérêt séparés par des points médians •]
    
    RÈGLES DE RÉDACTION :
    - Ton : Expert, proactif, orienté résultats.
    - Verbes d'action : Pilotage, Conception, Optimisation, Déploiement.
    - Personnalisation : Intègre les mots-clés de l'offre de ${job?.company} de manière fluide.
    
    PROFIL CANDIDAT:
    ${JSON.stringify(profile)}
    
    OFFRE:
    ${JSON.stringify(job)}
    `;
  } else {
    prompt = `Rédige une lettre de motivation ${type === 'spontaneous' ? 'spontanée' : 'ciblée'} pour ${job?.company || 'une entreprise'}.
    Langue: ${language}.
    
    STRUCTURE ET FORMATAGE :
    
    # [NOM COMPLET DU CANDIDAT]
    [VILLE, PAYS] | [TÉLÉPHONE] | [EMAIL]
    
    [DATE DU JOUR]
    
    À l'attention du responsable du recrutement
    [NOM DE L'ENTREPRISE]
    
    OBJET : Candidature pour le poste de ${job?.title || 'le poste proposé'}
    
    [CORPS DE LA LETTRE]
    1. Accroche (2 phrases): Connaissance entreprise + valeur.
    2. Pourquoi toi (3 phrases): 3 expériences concrètes avec chiffres.
    3. Pourquoi eux (2 phrases): Raison spécifique du choix.
    4. Call to action (1 phrase): Entretien de 30 min.
    
    Cordialement,
    [NOM COMPLET]
    
    PROFIL CANDIDAT:
    ${JSON.stringify(profile)}
    
    OFFRE:
    ${JSON.stringify(job)}
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "";
}

/**
 * FONCTION 6 : COACH_CARRIERE
 * Analyse les patterns et donne des conseils hebdomadaires.
 */
export async function getCareerCoachReport(profile: UserProfile, applications: any[]): Promise<string> {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tu es HireMe AI Coach. Analyse les candidatures récentes et le profil pour donner un rapport hebdomadaire.
    
    PROFIL:
    ${JSON.stringify(profile)}
    
    CANDIDATURES:
    ${JSON.stringify(applications)}
    
    INSTRUCTIONS:
    - Si 0 réponse après 10 candidatures → analyser pourquoi.
    - Identifier les gaps récurrents.
    - Recommander des certifications spécifiques.
    - Ton: Encourageant mais direct.
    `,
  });

  return response.text || "";
}

/**
 * FONCTION 6 : RÉPONDRE AUX QUESTIONS DE CANDIDATURE (AIHawk Style)
 * Génère des réponses optimisées pour les formulaires de candidature.
 */
export async function generateApplicationAnswers(cv: string, jobDesc: string, questions: string[]): Promise<string[]> {
  const ai = getGeminiModel();
  const prompt = `Tu es un expert en recrutement et un agent d'automatisation de candidatures (type AIHawk).
  Ta mission est de répondre à des questions spécifiques d'un formulaire de candidature en utilisant les informations du CV de l'utilisateur et la description du poste.
  
  CV de l'utilisateur:
  ${cv}
  
  Description du poste:
  ${jobDesc}
  
  Questions à répondre:
  ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
  
  RÈGLES:
  1. Réponds de manière concise mais percutante.
  2. Utilise des données chiffrées du CV si possible.
  3. Adapte le ton à l'entreprise.
  4. Réponds UNIQUEMENT avec un tableau JSON de chaînes de caractères (les réponses dans l'ordre des questions).
  
  FORMAT DE SORTIE:
  ["Réponse 1", "Réponse 2", ...]`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || "[]";
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse answers:", response.text);
    return questions.map(() => "Erreur lors de la génération de la réponse.");
  }
}

/**
 * FONCTION 7 : OPTIMISATION PROFIL LINKEDIN
 * Génère des suggestions pour le titre, le résumé et les expériences LinkedIn.
 */
export async function generateLinkedInOptimization(profile: UserProfile): Promise<string> {
  const ai = getGeminiModel();
  const prompt = `Tu es un expert en personal branding et LinkedIn.
  Optimise le profil LinkedIn de cet utilisateur pour maximiser sa visibilité auprès des recruteurs.
  
  PROFIL:
  ${JSON.stringify(profile)}
  
  INSTRUCTIONS:
  1. Propose 3 variantes de Titre (Headline) percutantes avec mots-clés.
  2. Rédige une section "Infos" (About) captivante en utilisant le storytelling.
  3. Donne des conseils pour la section "Compétences" et "Recommandations".
  4. Utilise des emojis de manière professionnelle.
  5. Langue: Français.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "";
}

// Legacy exports for compatibility during transition
export const parseCV = analyzeProfile;
export const generateDocument = async (type: any, cv: any, title: any, company: any, desc: any, lang: any) => {
  // Map legacy call to new function
  const profile = await analyzeProfile(cv);
  const job = { title, company, description: desc } as any;
  return generateTargetedDocument(type === 'CV' ? 'cv' : type === 'LM' ? 'cover_letter' : 'spontaneous', profile, job, lang === 'français' ? 'fr' : 'en');
};
export const generateSearchStrategy = async (keywords: string, location: string) => {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Génère une stratégie de recherche d'emploi (Boolean search, requêtes Google, entreprises cibles) pour: ${keywords} à ${location}.`,
  });
  return response.text || "";
};
export const analyzeATS = async (cv: string, jobDesc: string) => {
  const profile = await analyzeProfile(cv);
  const job = { description: jobDesc } as any;
  return scoreJobMatch(profile, job);
};
export { getGeminiModel };

/**
 * FONCTION 7 : CONSEILS CARRIÈRE PERSONNALISÉS
 * Analyse le profil et génère un rapport complet avec plan d'action.
 */
export async function getCareerAdvice(profile: UserProfile): Promise<{
  report: string;
  strengths: string[];
  gaps: string[];
  actionPlan: { title: string; description: string }[];
}> {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tu es un coach de carrière expert. Analyse le profil suivant et génère un rapport stratégique.
    
    PROFIL:
    ${JSON.stringify(profile)}
    
    INSTRUCTIONS:
    1. Identifie 3-5 points forts majeurs.
    2. Identifie 3-5 lacunes (gaps) critiques par rapport au rôle cible.
    3. Rédige un rapport de synthèse (markdown).
    4. Propose un plan d'action en 3-5 étapes concrètes.
    
    RÉPONS UNIQUEMENT EN JSON avec cette structure:
    {
      "report": "Texte markdown du rapport",
      "strengths": ["Point fort 1", "..."],
      "gaps": ["Lacune 1", "..."],
      "actionPlan": [
        { "title": "Étape 1", "description": "Détails..." },
        "..."
      ]
    }
    `,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse career advice JSON:", response.text);
    return {
      report: "Erreur lors de la génération du rapport.",
      strengths: [],
      gaps: [],
      actionPlan: []
    };
  }
}
