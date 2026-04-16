/**
 * Stripe Payment Cloud Functions
 * 
 * All Stripe operations are handled securely on the backend.
 * The Stripe Secret Key is NEVER exposed to the client.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  createPaymentIntent,
  createSubscription,
  cancelSubscription,
  getSubscriptionDetails,
  handleStripeWebhook,
  checkSubscriptionUsage,
  SUBSCRIPTION_PLANS,
} from "./services/stripe.service";

admin.initializeApp();

/**
 * Cloud Function: Create Payment Intent
 * 
 * Initiates a Stripe payment intent for subscription purchase
 * 
 * POST /stripe/createPaymentIntent
 * Body: { planId: string }
 * Headers: Authorization: Bearer <idToken>
 */
export const stripeCreatePaymentIntent = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify auth
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Missing authorization token" });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const email = decodedToken.email;

      const { planId } = req.body;

      if (!planId) {
        res.status(400).json({ error: "planId is required" });
        return;
      }

      if (!SUBSCRIPTION_PLANS[planId]) {
        res.status(400).json({ error: `Invalid planId: ${planId}` });
        return;
      }

      const result = await createPaymentIntent(userId, planId, email);

      res.json({
        success: true,
        clientSecret: result.clientSecret,
        amount: result.amount,
        planId,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function: Create Subscription
 * 
 * Finalizes subscription after successful payment
 * 
 * POST /stripe/createSubscription
 * Body: { planId: string, paymentMethodId: string }
 * Headers: Authorization: Bearer <idToken>
 */
export const stripeCreateSubscription = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify auth
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Missing authorization token" });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const email = decodedToken.email;

      const { planId, paymentMethodId } = req.body;

      if (!planId || !paymentMethodId) {
        res.status(400).json({
          error: "planId and paymentMethodId are required",
        });
        return;
      }

      const result = await createSubscription(
        userId,
        paymentMethodId,
        planId,
        email
      );

      res.json({
        success: true,
        subscriptionId: result.subscription,
        planId: result.planId,
        status: result.status,
        currentPeriodEnd: result.currentPeriodEnd,
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function: Cancel Subscription
 * 
 * Cancels a user's subscription
 * 
 * POST /stripe/cancelSubscription
 * Headers: Authorization: Bearer <idToken>
 */
export const stripeCancelSubscription = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify auth
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Missing authorization token" });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      const stripeSubscriptionId =
        userData?.subscription?.subscriptionId;

      if (!stripeSubscriptionId) {
        res.status(400).json({
          error: "User does not have an active subscription",
        });
        return;
      }

      const result = await cancelSubscription(stripeSubscriptionId);

      res.json({
        success: true,
        subscriptionId: result.subscriptionId,
        status: result.status,
        canceledAt: result.canceledAt,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function: Get Subscription Status
 * 
 * Returns current subscription status and usage
 * 
 * GET /stripe/subscriptionStatus
 * Headers: Authorization: Bearer <idToken>
 */
export const stripeGetSubscriptionStatus = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify auth
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      res.status(401).json({ error: "Missing authorization token" });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const usage = await checkSubscriptionUsage(userId);

      res.json({
        success: true,
        subscription: usage,
      });
    } catch (error) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Cloud Function: Stripe Webhook Handler
 * 
 * Processes webhook events from Stripe securely
 * Verifies webhook signature before processing
 * 
 * POST /stripe/webhook
 * Headers: stripe-signature
 */
export const stripeWebhook = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    try {
      // Get raw body for signature verification
      let body: string;

      if (typeof req.body === "string") {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }

      await handleStripeWebhook(body, signature, webhookSecret);

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook error",
      });
    }
  }
);

/**
 * Cloud Function: Get Available Plans
 * 
 * Returns all available subscription plans
 * Public endpoint (no auth required)
 * 
 * GET /stripe/plans
 */
export const stripeGetPlans = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
      }));

      res.json({
        success: true,
        plans,
      });
    } catch (error) {
      console.error("Error getting plans:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
