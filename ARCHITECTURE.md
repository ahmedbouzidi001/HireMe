# HireMe.ai Architecture Documentation

## Overview

HireMe.ai is a serverless job search and career optimization platform built on Firebase, with secure AI-powered features using Google Gemini API and Stripe for payments.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                 │
│  React 19 + Vite + TypeScript + Tailwind CSS                        │
│  - Authentication (Firebase Auth)                                   │
│  - CV Upload & Profile Management                                   │
│  - Job Search & Matching                                            │
│  - Document Generation (CV/Cover Letter)                            │
│  - Subscription Management (Stripe)                                 │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
                    │ HTTPS + Firebase Auth Token
                    │
     ┌──────────────▼──────────────────────────────┐
     │    FIREBASE CLOUD FUNCTIONS (Backend)       │
     │                                              │
     │  ┌────────────────────────────────────────┐ │
     │  │ API Endpoints (Secured by Auth)        │ │
     │  │ - analyzeProfile                       │ │
     │  │ - searchJobs                           │ │
     │  │ - scoreJobMatch                        │ │
     │  │ - generateDocument                     │ │
     │  │ - getCareerAdvice                      │ │
     │  │ - stripeCreatePaymentIntent            │ │
     │  │ - stripeCreateSubscription             │ │
     │  │ - stripeCancelSubscription             │ │
     │  │ - stripeWebhook (Signature Verified)   │ │
     │  │ - setupInitialAdmin                    │ │
     │  │ - grantAdminAccess                     │ │
     │  └────────────────────────────────────────┘ │
     │                                              │
     │  ┌────────────────────────────────────────┐ │
     │  │ Services                               │ │
     │  │ - Gemini AI (Secret Key Protected)     │ │
     │  │ - Stripe (Secret Key Protected)        │ │
     │  │ - Firestore Operations (RLS Enforced)  │ │
     │  └────────────────────────────────────────┘ │
     └──────────┬────────────────┬────────────────┘
                │                │
     ┌──────────▼──┐     ┌───────▼──────────┐
     │  FIRESTORE  │     │  GEMINI API      │
     │  (Database) │     │  (AI Analysis)   │
     │             │     │                  │
     │ Collections │     │  - CV Analysis   │
     │ - users     │     │  - Job Search    │
     │ - profiles  │     │  - ATS Matching  │
     │ - apps      │     │  - Advice Gen    │
     │ - invoices  │     └──────────────────┘
     │             │
     │ RLS Rules   │
     │ - User      │
     │   owned     │     ┌──────────────────┐
     │ - Admin     │     │  STRIPE          │
     │   access    │     │  (Payments)      │
     │             │     │                  │
     │ Audit Logs  │     │ - Subscriptions  │
     └─────────────┘     │ - Invoices       │
                         │ - Webhooks       │
                         └──────────────────┘
```

## Technology Stack

### Frontend
- **React 19.0.0** - UI Framework
- **Vite 6.2.0** - Build Tool & Dev Server
- **TypeScript ~5.8.2** - Type Safety
- **Tailwind CSS 4.1.14** - Styling
- **Motion 12.23.24** - Animations
- **Lucide React 0.546.0** - Icons
- **Firebase 12.11.0** - Auth & Realtime Database

### Backend (Cloud Functions)
- **Firebase Functions 5.0.0** - Serverless Runtime
- **Firebase Admin 12.0.0** - Database & Auth Admin
- **Google Generative AI 1.29.0** - AI API
- **Stripe 14.0.0** - Payment Processing
- **TypeScript** - Type Safety

### Database & Storage
- **Firestore** - Primary Database (NoSQL)
- **Firebase Authentication** - User Auth
- **Firebase Cloud Storage** - File Storage (Optional)

### External Services
- **Google Gemini API** - AI Analysis & Generation
- **Stripe** - Payment Processing
- **Firebase Hosting** - Static Hosting (Optional)

## Directory Structure

```
hiremeai/
├── src/
│   ├── App.tsx                      # Main application component
│   ├── main.tsx                     # Entry point
│   ├── lib/
│   │   ├── firebase.ts              # Firebase initialization
│   │   ├── api.ts                   # API wrapper (Gemini calls)
│   │   ├── stripe.ts                # Stripe client wrapper
│   │   ├── gemini.ts                # Gemini types (deprecated)
│   │   └── utils.ts                 # Utilities
│   ├── components/
│   │   ├── CVBuilder.tsx            # CV builder component
│   │   └── PremiumPage.tsx          # Premium features
│   └── translations.ts              # i18n support (FR, EN, AR)
│
├── functions/
│   ├── src/
│   │   ├── index.ts                 # Main exports
│   │   ├── admin-setup.ts           # Admin management functions
│   │   ├── stripe.ts                # Stripe endpoints
│   │   └── services/
│   │       ├── gemini.service.ts    # Gemini API service
│   │       └── stripe.service.ts    # Stripe service
│   ├── package.json                 # Functions dependencies
│   └── tsconfig.json                # Functions TypeScript config
│
├── public/
│   └── firebase-applet-config.json  # Firebase config (public)
│
├── scripts/
│   └── cleanup.js                   # Cleanup helper script
│
├── firestore.rules                  # Firestore security rules
├── firebase-applet-config.json      # Firebase project config
├── .env.example                     # Environment template
├── SECURITY.md                      # Security documentation
├── ADMIN_SETUP.md                   # Admin setup guide
├── ARCHITECTURE.md                  # This file
├── package.json                     # Frontend dependencies
└── vite.config.ts                   # Vite configuration
```

## Data Models

### Users Collection
```typescript
users/{uid}/
  ├── profile: UserProfile
  │   ├── name: string
  │   ├── email: string
  │   ├── phone: string
  │   ├── location: string
  │   ├── skills: string[]
  │   ├── experience_years: number
  │   └── employability_score: number
  │
  ├── subscription: SubscriptionData
  │   ├── planId: string
  │   ├── status: 'active' | 'canceled'
  │   ├── stripeCustomerId: string
  │   └── currentPeriodEnd: Timestamp
  │
  ├── searches/{searchId}
  │   ├── role: string
  │   ├── location: string
  │   └── createdAt: Timestamp
  │
  ├── matches/{matchId}
  │   ├── jobId: string
  │   ├── atsScore: number
  │   └── createdAt: Timestamp
  │
  ├── documents/{docId}
  │   ├── type: 'cv' | 'cover_letter'
  │   ├── content: string
  │   └── createdAt: Timestamp
  │
  └── invoices/{invoiceId}
      ├── invoiceId: string
      ├── amount: number
      └── pdfUrl: string
```

### Profiles Collection (Legacy, to be migrated)
```typescript
profiles/{userId}
  ├── user_id: string
  ├── name: string
  ├── email: string
  ├── skills: string[]
  └── ... (full UserProfile data)
```

### Applications Collection
```typescript
applications/{appId}
  ├── id: string
  ├── user_id: string
  ├── jobTitle: string
  ├── company: string
  ├── status: 'Applied' | 'Interview' | 'Rejected' | 'Offer' | 'Saved'
  ├── date: string (ISO date)
  └── content: string (generated CV/letter)
```

## API Endpoints

### Gemini AI Functions

#### POST `/analyzeProfile`
Analyzes CV and extracts structured profile information.
- Input: `{ cvText: string }`
- Output: `{ profile: UserProfile }`
- Auth: Required

#### POST `/searchJobs`
Searches for jobs matching role and location.
- Input: `{ role: string, location: string }`
- Output: `{ jobs: JobOffer[] }`
- Auth: Required

#### POST `/scoreJobMatch`
Scores match between profile and job.
- Input: `{ profile: UserProfile, job: JobOffer }`
- Output: `{ atsResult: ATSResult }`
- Auth: Required

#### POST `/generateDocument`
Generates targeted CV or cover letter.
- Input: `{ type: string, profile: UserProfile, job: JobOffer, language: string }`
- Output: `{ document: string }`
- Auth: Required

### Stripe Payment Functions

#### GET `/stripe/plans`
Gets available subscription plans.
- Output: `{ plans: SubscriptionPlan[] }`
- Auth: None

#### POST `/stripe/createPaymentIntent`
Creates Stripe payment intent for subscription.
- Input: `{ planId: string }`
- Output: `{ clientSecret: string, amount: number }`
- Auth: Required

#### POST `/stripe/createSubscription`
Creates recurring subscription after payment.
- Input: `{ planId: string, paymentMethodId: string }`
- Output: `{ subscriptionId: string, status: string }`
- Auth: Required

#### POST `/stripe/cancelSubscription`
Cancels user's subscription.
- Output: `{ subscriptionId: string, status: string }`
- Auth: Required

#### GET `/stripe/subscriptionStatus`
Gets current subscription status and usage limits.
- Output: `{ planId, planName, jobMatchesRemaining, documentGenerationsRemaining }`
- Auth: Required

#### POST `/stripe/webhook`
Handles Stripe webhook events (signature verified).
- Triggers: Subscription created/updated/deleted, payment succeeded/failed
- Auth: Webhook signature verification

### Admin Functions

#### POST `/setupInitialAdmin`
Sets up the initial admin user (one-time).
- Input: `{ adminEmail: string }`
- Output: `{ uid: string, message: string }`
- Auth: None (protected in production)

#### POST `/grantAdminAccess`
Grants admin access to a user (admin only).
- Input: `{ newAdminEmail: string }`
- Output: `{ uid: string, message: string }`
- Auth: Required, Admin

#### POST `/revokeAdminAccess`
Revokes admin access from a user (admin only).
- Input: `{ adminEmail: string }`
- Output: `{ uid: string, message: string }`
- Auth: Required, Admin

#### GET `/getUserInfo`
Gets detailed user information (admin only).
- Query: `?uid=USER_UID`
- Output: `{ user: UserInfo }`
- Auth: Required, Admin

## Security Model

### Authentication
- Firebase Authentication handles user login/signup
- Custom Claims for admin role identification
- ID tokens included in all API requests

### Authorization
- Firestore Security Rules enforce row-level security
- Each user can only access their own data
- Cloud Functions verify auth tokens
- Admin functions require admin Custom Claim

### Sensitive Data Protection
- Gemini API key stored in Cloud Functions environment (never in client)
- Stripe Secret Key stored in Cloud Functions environment (never in client)
- Firestore rules prevent unauthorized access

### Audit & Logging
- All admin operations logged to `audit-logs` collection
- Stripe webhook events logged
- Cloud Functions logs available for debugging

## Deployment Guide

### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

### Deploy Frontend
```bash
npm install
npm run build
firebase deploy --only hosting
```

### Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Complete Deployment
```bash
firebase deploy  # Deploys all: hosting, functions, rules
```

## Environment Variables

### Client-side (.env or .env.local)
```
REACT_APP_FUNCTIONS_URL=https://region-projectId.cloudfunctions.net
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Cloud Functions (firebase functions:config:set)
```
gemini.api_key=YOUR_GEMINI_API_KEY
stripe.secret_key=sk_live_... (if needed locally)
stripe.webhook_secret=whsec_... (for testing webhooks)
```

## Performance Considerations

### Caching
- Firestore caches user data locally
- Firebase Authentication caches tokens
- API responses cached by browser

### Optimization
- Code splitting with Vite
- Image optimization (use WebP)
- CSS tree-shaking via Tailwind
- Database indices for common queries

### Scalability
- Cloud Functions auto-scale
- Firestore scales to millions of operations
- Stripe handles payment load
- Firebase CDN for static content

## Monitoring & Debugging

### Logs
```bash
firebase functions:log              # Live function logs
firebase functions:log --lines=50   # Last 50 lines
gcloud logging read "resource.type=cloud_function" # Via CLI
```

### Errors
- Check Cloud Functions logs for API errors
- Check Firestore Security Rules for permission denied
- Check browser console for client-side errors

### Debugging
```bash
firebase emulators:start            # Local emulation
firebase debug --inspect-functions  # Debug mode
```

## Future Improvements

### Phase 2
- Rate limiting on API endpoints
- Email notifications
- Batch job importing

### Phase 3
- Machine learning for better recommendations
- Real-time job updates via Firestore listeners
- Mobile app with React Native

### Phase 4
- GDPR compliance features
- Data export functionality
- Advanced analytics dashboard

## Support & Maintenance

- **Security issues**: See SECURITY.md
- **Admin setup**: See ADMIN_SETUP.md
- **Documentation**: See README.md
- **Issues**: GitHub issues or admin@hiremeai.example.com
