# HireMe.ai Security Architecture

## Overview

This document outlines the security measures implemented in HireMe.ai to protect user data and API keys.

## Security Improvements (Phase 1)

### 1. API Key Protection - Gemini API

**Problem:** The Gemini API key was exposed in client-side code via `process.env.GEMINI_API_KEY`.

**Solution:** 
- Moved all Gemini API calls to **Firebase Cloud Functions** backend
- The API key is now only accessible in secure server-side environment
- Client code can no longer access or expose the API key

**Implementation:**
- `/functions/src/services/gemini.service.ts` - All Gemini operations
- `/functions/src/index.ts` - HTTP endpoints protected by Firebase Auth
- `/src/lib/api.ts` - Client-side API wrapper with authentication

**How it works:**
1. User authenticates with Firebase Auth (client-side)
2. Client gets ID token from Firebase
3. Client makes authenticated requests to Cloud Functions endpoints
4. Cloud Functions verify the token and execute Gemini API calls
5. Results are returned to client and optionally saved to Firestore

### 2. Admin Access Control

**Problem:** Admin access was checked with hardcoded email address in Firestore rules.

**Solution:**
- Implemented **Firebase Custom Claims** for admin role management
- Admins are identified by a `admin: true` claim in their Firebase token
- Claim is set server-side via Cloud Functions or Firebase Admin SDK

**Implementation:**
- `/functions/src/utils/adminSetup.ts` - Admin grant/revoke functions
- `firestore.rules` - Updated to use Custom Claims instead of email

**To grant admin access:**
```typescript
import { setUserAsAdmin } from './functions/src/utils/adminSetup';

const uid = 'user-uid-here';
await setUserAsAdmin(uid);
```

### 3. Firestore Security Rules

**Improvements:**
- Row-Level Security (RLS) for user data
- Each user can only access their own data
- Cloud Functions can write but clients cannot directly
- Sub-collections for organized data storage:
  - `users/{uid}/searches` - Job search history
  - `users/{uid}/matches` - ATS score results
  - `users/{uid}/documents` - Generated CVs/cover letters
  - `users/{uid}/reports` - Career coaching reports

**Current Rules:**
```
- profiles/{userId}: User can read/write their own profile
- applications/{appId}: User can read/write their own applications
- users/{uid}/*: Cloud Functions write only (RLS enforced)
```

### 4. Environment Variables

**Configuration:**
```env
# Client-side (public)
REACT_APP_FUNCTIONS_URL=https://us-central1-hiremeai.cloudfunctions.net

# Server-side only (Cloud Functions)
GEMINI_API_KEY=*** (never expose to client)
STRIPE_SECRET_KEY=*** (backend only)

# Deprecated
# VITE_SUPABASE_URL= (no longer used)
# VITE_SUPABASE_ANON_KEY= (no longer used)
```

## Security Best Practices

### For Users
1. **Never share API keys** in client-side code or environment files
2. **Use HTTPS** only for all API calls
3. **Enable 2FA** on your Firebase project account
4. **Rotate credentials** regularly

### For Developers
1. **Cloud Functions:**
   - All sensitive API keys go here
   - Set via Firebase Console or `.env` (not in code)
   - Use environment variables for configuration

2. **Client-side:**
   - Only public Firebase config
   - Never store API keys or secrets
   - All API calls must be authenticated

3. **Firestore Rules:**
   - Always enforce user ownership
   - Validate all data structures
   - Use Custom Claims for role-based access

### Deployment Checklist
- [ ] Set `REACT_APP_FUNCTIONS_URL` in production
- [ ] Set `GEMINI_API_KEY` in Cloud Functions environment
- [ ] Deploy Firestore rules from `firestore.rules`
- [ ] Set up admin users with Custom Claims
- [ ] Enable Firebase Security Rules in production
- [ ] Configure CORS properly for your domain
- [ ] Monitor Cloud Functions logs for errors
- [ ] Set up Cloud Firestore backups

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ HTTPS + Firebase Auth Token
       │
       ▼
┌──────────────────────────────────┐
│ Firebase Cloud Functions         │
│ ┌──────────────────────────────┐ │
│ │ - Verify Auth Token          │ │
│ │ - Call Gemini API (secret)   │ │
│ │ - Save to Firestore          │ │
│ │ - Return Results             │ │
│ └──────────────────────────────┘ │
└────────┬─────────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
    ┌─────────┐              ┌──────────────┐
    │ Gemini  │              │  Firestore   │
    │   API   │              │   (Secure)   │
    └─────────┘              └──────────────┘
```

## Sensitive Operations

### 1. CV Analysis
- User uploads CV (text only, no file storage server-side)
- Cloud Function calls Gemini to analyze
- Results stored in `users/{uid}/profile`
- Only authenticated user can access their profile

### 2. Job Matching
- User profile + job details sent to Cloud Function
- Gemini scores the match
- Result stored in `users/{uid}/matches`
- Cloud Functions log all operations for audit

### 3. Document Generation (CV/Cover Letter)
- Targeted document generated by Gemini
- Generated content stored in `users/{uid}/documents`
- Available for download by user only

## Monitoring & Logging

All sensitive operations are logged:
- Firebase Authentication logs
- Cloud Functions execution logs
- Firestore audit logs (with blurred PII)

**Monitor these in Firebase Console:**
1. Authentication → Sign-in method activity
2. Cloud Functions → Logs
3. Firestore → Audit logs (if enabled)

## Known Limitations & Future Improvements

1. **Current:**
   - Email-based admin check removed ✓
   - Gemini API key protected ✓
   - Firestore RLS implemented ✓

2. **Planned (Phase 2):**
   - Rate limiting on API endpoints
   - Stripe backend validation
   - GDPR data export functionality
   - Encryption at rest for sensitive fields

## References

- [Firebase Security Rules Best Practices](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin-setup#create_custom_claims)
- [Google Generative AI Security](https://ai.google.dev/docs)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

## Support

For security concerns or vulnerability reports:
1. Do NOT create public issues
2. Contact: security@hiremeai.example.com
3. Include detailed information about the vulnerability
4. Allow 48 hours for initial response
