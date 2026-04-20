import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  analyzeProfile,
  searchJobs,
  scoreJobMatch,
  generateTargetedDocument,
  getCareerCoachReport,
  generateLinkedInOptimization,
  getCareerAdvice,
  UserProfile,
  JobOffer,
} from "./services/gemini.service";

// Re-export admin setup functions
export {
  setupInitialAdmin,
  grantAdminAccess,
  revokeAdminAccess,
  getUserInfo,
} from "./admin-setup";

// Re-export Stripe functions
export {
  stripeCreatePaymentIntent,
  stripeCreateSubscription,
  stripeCancelSubscription,
  stripeGetSubscriptionStatus,
  stripeWebhook,
  stripeGetPlans,
} from "./stripe";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Middleware to verify Firebase Auth tokens
async function verifyAuth(
  req: functions.https.Request,
  res: functions.Response
): Promise<string | null> {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    res.status(401).json({ error: "Invalid authorization token" });
    return null;
  }
}

/**
 * Cloud Function 1: Analyze CV Profile
 * POST /analyzeProfile
 */
export const analyzeProfileFunction = functions.https.onRequest(
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify auth
    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { cvText } = req.body;

    if (!cvText || typeof cvText !== "string") {
      res.status(400).json({ error: "cvText is required and must be a string" });
      return;
    }

    try {
      const profile = await analyzeProfile(cvText);

      // Save profile to Firestore
      await db.collection("users").doc(userId).set(
        {
          profile,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({ success: true, profile });
    } catch (error) {
      console.error("Error analyzing profile:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 2: Search Jobs
 * POST /searchJobs
 */
export const searchJobsFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { role, location } = req.body;

    if (!role || !location) {
      res.status(400).json({ error: "role and location are required" });
      return;
    }

    try {
      const jobs = await searchJobs(role, location);

      // Save search to Firestore
      await db
        .collection("users")
        .doc(userId)
        .collection("searches")
        .add({
          role,
          location,
          jobsFound: jobs.length,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, jobs, count: jobs.length });
    } catch (error) {
      console.error("Error searching jobs:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 3: Score Job Match
 * POST /scoreJobMatch
 */
export const scoreJobMatchFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { profile, job } = req.body;

    if (!profile || !job) {
      res.status(400).json({ error: "profile and job are required" });
      return;
    }

    try {
      const atsResult = await scoreJobMatch(profile, job);

      // Save match analysis
      await db
        .collection("users")
        .doc(userId)
        .collection("matches")
        .add({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          atsResult,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, atsResult });
    } catch (error) {
      console.error("Error scoring job match:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 4: Generate Targeted Document (CV or Cover Letter)
 * POST /generateDocument
 */
export const generateDocumentFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { type, profile, job, language = "fr" } = req.body;

    if (!type || !profile || !job) {
      res.status(400).json({
        error: "type, profile, and job are required",
      });
      return;
    }

    try {
      const document = await generateTargetedDocument(
        type,
        profile,
        job,
        language
      );

      // Save generated document
      await db
        .collection("users")
        .doc(userId)
        .collection("documents")
        .add({
          type,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          language,
          content: document,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, document });
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 5: Get Career Coach Report
 * POST /getCareerCoachReport
 */
export const getCareerCoachReportFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { profile, applications } = req.body;

    if (!profile) {
      res.status(400).json({ error: "profile is required" });
      return;
    }

    try {
      const report = await getCareerCoachReport(profile, applications || []);

      // Save report
      await db
        .collection("users")
        .doc(userId)
        .collection("reports")
        .add({
          type: "career_coach",
          content: report,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, report });
    } catch (error) {
      console.error("Error generating career coach report:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 6: Generate LinkedIn Optimization
 * POST /generateLinkedInOptimization
 */
export const generateLinkedInOptimizationFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { profile } = req.body;

    if (!profile) {
      res.status(400).json({ error: "profile is required" });
      return;
    }

    try {
      const optimization = await generateLinkedInOptimization(profile);

      // Save optimization
      await db
        .collection("users")
        .doc(userId)
        .collection("documents")
        .add({
          type: "linkedin_optimization",
          content: optimization,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, optimization });
    } catch (error) {
      console.error("Error generating LinkedIn optimization:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function 7: Get Career Advice
 * POST /getCareerAdvice
 */
export const getCareerAdviceFunction = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const userId = await verifyAuth(req, res);
    if (!userId) return;

    const { profile } = req.body;

    if (!profile) {
      res.status(400).json({ error: "profile is required" });
      return;
    }

    try {
      const advice = await getCareerAdvice(profile);

      // Save advice report
      await db
        .collection("users")
        .doc(userId)
        .collection("reports")
        .add({
          type: "career_advice",
          content: advice,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true, advice });
    } catch (error) {
      console.error("Error generating career advice:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
