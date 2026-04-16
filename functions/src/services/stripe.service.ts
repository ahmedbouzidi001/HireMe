/**
 * STRIPE PAYMENT SERVICE
 * 
 * This service handles all Stripe operations on the backend.
 * The Stripe API key is never exposed to the client.
 * 
 * All payments are validated server-side:
 * 1. Client initiates payment intent (secure)
 * 2. Stripe handles payment (secure)
 * 3. Server verifies webhook signature
 * 4. Server updates user subscription in Firestore
 */

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in cents
  currency: string;
  interval: "month" | "year";
  features: string[];
  jobMatchesPerMonth: number;
  documentGenerations: number;
}

export interface StripeCustomer {
  uid: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "unpaid";
  planId?: string;
  currentPeriodEnd?: Date;
  autoRenew: boolean;
}

// Define subscription plans
export const SUBSCRIPTION_PLANS: { [key: string]: SubscriptionPlan } = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    interval: "month",
    features: [
      "1 CV upload per month",
      "5 job searches per month",
      "Community support",
    ],
    jobMatchesPerMonth: 5,
    documentGenerations: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 999, // $9.99/month
    currency: "usd",
    interval: "month",
    features: [
      "Unlimited CV uploads",
      "50 job searches per month",
      "10 CV/Cover letter generations",
      "Career coaching reports",
      "LinkedIn optimization",
      "Email support",
    ],
    jobMatchesPerMonth: 50,
    documentGenerations: 10,
  },
  pro_annual: {
    id: "pro_annual",
    name: "Pro (Annual)",
    price: 9990, // $99.90/year
    currency: "usd",
    interval: "year",
    features: [
      "Everything in Pro",
      "Save 17% vs monthly",
      "Priority email support",
    ],
    jobMatchesPerMonth: 50,
    documentGenerations: 10,
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 1999, // $19.99/month
    currency: "usd",
    interval: "month",
    features: [
      "Everything in Pro",
      "Unlimited everything",
      "Priority phone support",
      "1-on-1 career coaching session/month",
      "API access",
    ],
    jobMatchesPerMonth: 999999, // Unlimited
    documentGenerations: 999999, // Unlimited
  },
};

/**
 * Create a Stripe Payment Intent
 * 
 * The client initiates a payment, and the server creates a secure payment intent
 */
export async function createPaymentIntent(
  userId: string,
  planId: string,
  email: string
): Promise<{ clientSecret: string; amount: number }> {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  if (plan.price === 0) {
    throw new Error("Free plan does not require payment");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: plan.currency,
      metadata: {
        userId,
        planId,
        email,
      },
      receipt_email: email,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: plan.price,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

/**
 * Create a Subscription for a customer
 * 
 * This is called after successful payment to set up recurring billing
 */
export async function createSubscription(
  userId: string,
  stripePaymentMethodId: string,
  planId: string,
  email: string
): Promise<any> {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  try {
    // Get or create Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId,
        },
      });
    }

    // For free plan, just create customer record
    if (plan.price === 0) {
      return {
        customer: customer.id,
        subscription: null,
        planId,
      };
    }

    // Create subscription with one-time payment
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: plan.features.join(", "),
              metadata: {
                planId,
              },
            },
            unit_amount: plan.price,
            recurring: {
              interval: plan.interval,
              interval_count: 1,
            },
          },
        },
      ],
      default_payment_method: stripePaymentMethodId,
      off_session: true,
      metadata: {
        userId,
        planId,
      },
    });

    return {
      customer: customer.id,
      subscription: subscription.id,
      planId,
      status: subscription.status,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ),
    };
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(stripeSubscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.del(stripeSubscriptionId);
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      canceledAt: new Date(subscription.canceled_at * 1000),
    };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscriptionDetails(
  stripeSubscriptionId: string
): Promise<any> {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      planId: subscription.metadata?.planId,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    throw error;
  }
}

/**
 * Handle Webhook Events from Stripe
 * 
 * This processes webhooks securely by verifying the signature
 * and updating user subscriptions in Firestore
 */
export async function handleStripeWebhook(
  body: string,
  signature: string,
  webhookSecret: string
): Promise<any> {
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error("Invalid webhook signature");
  }

  const db = (await import("firebase-admin")).default.firestore();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await db
            .collection("users")
            .doc(userId)
            .set(
              {
                subscription: {
                  stripeCustomerId: subscription.customer,
                  subscriptionId: subscription.id,
                  planId: subscription.metadata?.planId,
                  status: subscription.status,
                  currentPeriodEnd: new Date(
                    subscription.current_period_end * 1000
                  ),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                  autoRenew: !subscription.cancel_at_period_end,
                  updatedAt: new Date(),
                },
              },
              { merge: true }
            );

          console.log(
            `✓ Subscription updated for user ${userId}: ${subscription.status}`
          );
        }
      }
      break;

    case "customer.subscription.deleted":
      {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await db
            .collection("users")
            .doc(userId)
            .set(
              {
                subscription: {
                  status: "canceled",
                  canceledAt: new Date(
                    subscription.canceled_at * 1000
                  ),
                  updatedAt: new Date(),
                },
              },
              { merge: true }
            );

          console.log(`✓ Subscription canceled for user ${userId}`);
        }
      }
      break;

    case "invoice.payment_succeeded":
      {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            await db
              .collection("users")
              .doc(userId)
              .collection("invoices")
              .add({
                invoiceId: invoice.id,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status,
                pdfUrl: invoice.invoice_pdf,
                createdAt: new Date(invoice.created * 1000),
              });

            console.log(
              `✓ Payment succeeded for user ${userId}: $${
                invoice.amount_paid / 100
              }`
            );
          }
        }
      }
      break;

    case "invoice.payment_failed":
      {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            await db
              .collection("users")
              .doc(userId)
              .set(
                {
                  paymentFailure: {
                    invoiceId: invoice.id,
                    error: invoice.last_payment_error?.message,
                    failedAt: new Date(invoice.created * 1000),
                  },
                },
                { merge: true }
              );

            console.log(
              `✗ Payment failed for user ${userId}: ${invoice.last_payment_error?.message}`
            );
          }
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

/**
 * Get subscription usage for a user
 * 
 * This checks against the user's current plan limits
 */
export async function checkSubscriptionUsage(
  userId: string
): Promise<{
  planId: string;
  planName: string;
  jobMatchesRemaining: number;
  documentGenerationsRemaining: number;
  isPremium: boolean;
}> {
  const db = (await import("firebase-admin")).default.firestore();

  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  const planId = userData?.subscription?.planId || "free";
  const plan = SUBSCRIPTION_PLANS[planId];

  // Get usage from Firestore
  const usageDoc = await db
    .collection("users")
    .doc(userId)
    .collection("usage")
    .doc("current-month")
    .get();
  const usage = usageDoc.data() || { jobMatches: 0, documentGenerations: 0 };

  return {
    planId: plan.id,
    planName: plan.name,
    jobMatchesRemaining: Math.max(
      0,
      plan.jobMatchesPerMonth - (usage.jobMatches || 0)
    ),
    documentGenerationsRemaining: Math.max(
      0,
      plan.documentGenerations - (usage.documentGenerations || 0)
    ),
    isPremium: planId === "premium",
  };
}
