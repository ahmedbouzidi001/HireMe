import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set in Cloud Functions");
}

const genai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

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
 * ANALYSE PROFIL - Extrait les compétences et calcule le score d'employabilité
 */
export async function analyzeProfile(cvText: string): Promise<UserProfile> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu es un expert RH spécialisé dans le marché tunisien et international. 
Analyse ce CV et extrait les informations structurées.

RÈGLES DE CALCUL DU SCORE (0-100):
- Complétude du profil (25%)
- Certifications reconnues (25%)
- Résultats chiffrés dans le CV (25%)
- Compétences demandées sur le marché tunisien actuellement (25%)

CV TEXT:
${cvText}`,
          },
        ],
      },
    ],
    generationConfig: {
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
                description: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
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
                details: { type: Type.STRING },
              },
            },
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
                priority: {
                  type: Type.STRING,
                  enum: ["high", "medium", "low"],
                },
              },
            },
          },
          market_positioning: { type: Type.STRING },
        },
        required: [
          "name",
          "email",
          "skills",
          "experiences",
          "education",
          "employability_score",
          "profile_summary",
          "top_gaps",
        ],
      },
    },
  });

  const profile = JSON.parse(response.response.text() || "{}");
  return {
    ...profile,
    cv_raw_text: cvText,
  };
}

/**
 * RECHERCHE OFFRES - Utilise Google Search pour trouver des offres réelles
 */
export async function searchJobs(
  role: string,
  location: string
): Promise<JobOffer[]> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Trouve des offres d'emploi réelles et récentes pour le poste de "${role}" à "${location}".
Utilise des sources fiables comme LinkedIn, Indeed, Tanitjobs, Rekrute.
Tu DOIS extraire les informations et les retourner sous forme d'une liste d'objets JSON.
Chaque offre doit avoir un titre, une entreprise, un lieu, une description courte, une URL directe et la source.`,
          },
        ],
      },
    ],
    generationConfig: {
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
            posted_at: { type: Type.STRING },
          },
          required: ["title", "company", "url", "source"],
        },
      },
    },
    tools: [{ googleSearch: {} }],
  });

  try {
    const text = response.response.text() || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse jobs JSON:", e);
    return [];
  }
}

/**
 * SCORER MATCH ATS - Compare un profil avec une offre
 */
export async function scoreJobMatch(
  profile: UserProfile,
  job: JobOffer
): Promise<ATSResult> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyse le match entre ce candidat et cette offre d'emploi.

CANDIDAT:
${JSON.stringify(profile)}

OFFRE:
${JSON.stringify(job)}

CALCUL DU SCORE (0-100):
- Keywords techniques matchés : 40%
- Niveau d'expérience requis vs disponible : 30%
- Localisation compatible : 15%
- Langue requise disponible : 15%`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ats_score: { type: Type.NUMBER },
          matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING },
          apply_recommendation: { type: Type.BOOLEAN },
        },
        required: [
          "ats_score",
          "matched_keywords",
          "missing_keywords",
          "recommendation",
        ],
      },
    },
  });

  return JSON.parse(response.response.text() || "{}");
}

/**
 * GENERER DOCUMENT - Crée un CV ou lettre de motivation ciblée
 */
export async function generateTargetedDocument(
  type: "cv" | "cover_letter" | "spontaneous",
  profile: UserProfile,
  job: JobOffer,
  language: "fr" | "en" | "ar" = "fr"
): Promise<string> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  let prompt = "";

  if (type === "cv") {
    prompt = `Génère un CV EXTRAORDINAIRE, stratégique et moderne pour le poste de ${job.title} chez ${job.company}.
Langue: ${language}.

OBJECTIF : Le candidat doit paraître comme la solution idéale au problème de l'entreprise.

STRUCTURE ET FORMATAGE STRICTS:

# [NOM COMPLET DU CANDIDAT]
## [TITRE PROFESSIONNEL CIBLÉ]
### [SPÉCIALITÉ 1] • [SPÉCIALITÉ 2] • [SPÉCIALITÉ 3]
[VILLE, PAYS] | [TÉLÉPHONE] | [EMAIL]

--- PROPOSITION DE VALEUR ---
[Un paragraphe expliquant POURQUOI le candidat est l'expert idéal]

--- EXPÉRIENCES PROFESSIONNELLES ---
[Pour chaque expérience pertinente]
**[TITRE DU POSTE]** | [DATES]
*[NOM DE L'ENTREPRISE]* | [VILLE, PAYS]
• [Réalisation majeure 1 avec CHIFFRES]
• [Réalisation majeure 2 avec CHIFFRES]

--- FORMATION ---
**[NOM DU DIPLÔME]** | [ANNÉES]
*[ÉCOLE/UNIVERSITÉ]* | [VILLE, PAYS]

--- COMPÉTENCES ---
• **[CATÉGORIE 1]**: [Compétences]
• **[CATÉGORIE 2]**: [Compétences]

--- CERTIFICATIONS ---
[Liste des certifications]

--- LANGUES ---
[Langues et niveaux]

--- CENTRES D'INTÉRÊT ---
[Centres d'intérêt]

PROFIL CANDIDAT:
${JSON.stringify(profile)}

OFFRE:
${JSON.stringify(job)}`;
  } else {
    prompt = `Rédige une lettre de motivation ${type === "spontaneous" ? "spontanée" : "ciblée"} pour ${job.company}.
Langue: ${language}.

STRUCTURE:
# [NOM COMPLET DU CANDIDAT]
[VILLE, PAYS] | [TÉLÉPHONE] | [EMAIL]

[DATE DU JOUR]

À l'attention du responsable du recrutement
[NOM DE L'ENTREPRISE]

OBJET : Candidature pour le poste de ${job.title}

[CORPS DE LA LETTRE]
1. Accroche (2 phrases): Connaissance entreprise + valeur
2. Pourquoi toi (3 phrases): 3 expériences concrètes
3. Pourquoi eux (2 phrases): Raison spécifique
4. Call to action (1 phrase): Entretien de 30 min

Cordialement,
[NOM COMPLET]

PROFIL CANDIDAT:
${JSON.stringify(profile)}

OFFRE:
${JSON.stringify(job)}`;
  }

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.response.text() || "";
}

/**
 * COACH CARRIERE - Rapport hebdomadaire avec recommandations
 */
export async function getCareerCoachReport(
  profile: UserProfile,
  applications: any[]
): Promise<string> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu es HireMe AI Coach. Analyse les candidatures récentes et le profil pour donner un rapport hebdomadaire.

PROFIL:
${JSON.stringify(profile)}

CANDIDATURES:
${JSON.stringify(applications)}

INSTRUCTIONS:
- Si 0 réponse après 10 candidatures → analyser pourquoi
- Identifier les gaps récurrents
- Recommander des certifications spécifiques
- Ton: Encourageant mais direct`,
          },
        ],
      },
    ],
  });

  return response.response.text() || "";
}

/**
 * OPTIMISATION LINKEDIN - Suggestions pour profil LinkedIn
 */
export async function generateLinkedInOptimization(
  profile: UserProfile
): Promise<string> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu es un expert en personal branding et LinkedIn.
Optimise le profil LinkedIn de cet utilisateur pour maximiser sa visibilité auprès des recruteurs.

PROFIL:
${JSON.stringify(profile)}

INSTRUCTIONS:
1. Propose 3 variantes de Titre (Headline) percutantes
2. Rédige une section "Infos" captivante
3. Conseils pour la section "Compétences"
4. Utilise des emojis de manière professionnelle
5. Langue: Français`,
          },
        ],
      },
    ],
  });

  return response.response.text() || "";
}

/**
 * CONSEILS CARRIERE - Rapport stratégique complet
 */
export async function getCareerAdvice(profile: UserProfile): Promise<{
  report: string;
  strengths: string[];
  gaps: string[];
  actionPlan: { title: string; description: string }[];
}> {
  const model = genai.models.generativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu es un coach de carrière expert. Analyse le profil suivant et génère un rapport stratégique.

PROFIL:
${JSON.stringify(profile)}

INSTRUCTIONS:
1. Identifie 3-5 points forts majeurs
2. Identifie 3-5 lacunes (gaps) critiques
3. Rédige un rapport de synthèse (markdown)
4. Propose un plan d'action en 3-5 étapes

RÉPONDS UNIQUEMENT EN JSON:
{
  "report": "Texte markdown du rapport",
  "strengths": ["Point fort 1"],
  "gaps": ["Lacune 1"],
  "actionPlan": [
    { "title": "Étape 1", "description": "Détails..." }
  ]
}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  try {
    return JSON.parse(response.response.text() || "{}");
  } catch (e) {
    console.error("Failed to parse career advice JSON:", e);
    return {
      report: "Erreur lors de la génération du rapport.",
      strengths: [],
      gaps: [],
      actionPlan: [],
    };
  }
}
