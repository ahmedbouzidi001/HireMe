import { auth } from './firebase';

const API_BASE_URL = process.env.REACT_APP_FUNCTIONS_URL || 'https://us-central1-hiremeai.cloudfunctions.net';

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
}

/**
 * Generic fetch wrapper with auth
 */
async function apiCall<T>(
  endpoint: string,
  method: 'POST' | 'GET' = 'POST',
  data?: any
): Promise<T> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/stripe${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: method === 'POST' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Stripe API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Interface for subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/stripe/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.status}`);
    }

    const data = await response.json();
    return data.plans;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
}

/**
 * Create a payment intent for subscription
 */
export async function createPaymentIntent(planId: string): Promise<string> {
  const result = await apiCall<{ success: boolean; clientSecret: string }>(
    '/createPaymentIntent',
    'POST',
    { planId }
  );
  return result.clientSecret;
}

/**
 * Create subscription after successful payment
 */
export async function createSubscription(
  planId: string,
  paymentMethodId: string
): Promise<{ subscriptionId: string; status: string }> {
  const result = await apiCall<{
    success: boolean;
    subscriptionId: string;
    status: string;
  }>(
    '/createSubscription',
    'POST',
    { planId, paymentMethodId }
  );
  return {
    subscriptionId: result.subscriptionId,
    status: result.status,
  };
}

/**
 * Cancel current subscription
 */
export async function cancelSubscription(): Promise<void> {
  await apiCall('/cancelSubscription', 'POST', {});
}

/**
 * Get current subscription status and usage
 */
export async function getSubscriptionStatus(): Promise<{
  planId: string;
  planName: string;
  jobMatchesRemaining: number;
  documentGenerationsRemaining: number;
  isPremium: boolean;
}> {
  const result = await apiCall<{
    success: boolean;
    subscription: {
      planId: string;
      planName: string;
      jobMatchesRemaining: number;
      documentGenerationsRemaining: number;
      isPremium: boolean;
    };
  }>('/subscriptionStatus', 'GET');

  return result.subscription;
}

/**
 * Load Stripe.js library
 */
export async function loadStripe() {
  const { loadStripe: stripeLoad } = await import('@stripe/stripe-js');
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('Stripe publishable key not configured');
  }

  return stripeLoad(publishableKey);
}
