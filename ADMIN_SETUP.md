# HireMe.ai - Admin Setup Guide

## Overview

This guide walks you through setting up admin users and deploying the secure Cloud Functions architecture.

## Prerequisites

- Firebase project initialized
- `firebase-cli` installed (`npm install -g firebase-tools`)
- Authenticated to Firebase (`firebase login`)
- Node.js 18+

## Step 1: Deploy Cloud Functions

### 1.1 Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 1.2 Set Gemini API Key in Cloud Functions

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

Verify it was set:
```bash
firebase functions:config:get
```

### 1.3 Deploy All Functions

```bash
firebase deploy --only functions
```

This will deploy:
- `analyzeProfile` - CV analysis endpoint
- `searchJobs` - Job search endpoint
- `scoreJobMatch` - ATS matching endpoint
- `generateDocument` - CV/Letter generation endpoint
- `getCareerCoachReport` - Career coaching endpoint
- `generateLinkedInOptimization` - LinkedIn suggestions endpoint
- `getCareerAdvice` - Career advice endpoint
- `setupInitialAdmin` - Admin setup endpoint
- `grantAdminAccess` - Grant admin to users endpoint
- `revokeAdminAccess` - Revoke admin access endpoint
- `getUserInfo` - Get user info endpoint (admin only)

## Step 2: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This deploys the enhanced security rules from `firestore.rules`.

## Step 3: Setup Initial Admin

### 3.1 Get Your Firestore Emulator Running (Optional, for testing)

```bash
firebase emulators:start
```

### 3.2 Create Initial Admin User

**Option A: Via Firebase Console (Recommended for production)**

1. Go to Firebase Console → Authentication
2. Create a new user with email: admin@yourcompany.com
3. Get their UID

**Option B: Via Firebase CLI**

```bash
firebase auth:create --email admin@yourcompany.com --password TempPassword123!
```

Note the UID from the output.

### 3.3 Grant Admin Claims

Using the Firebase Admin SDK directly:

```bash
# Create a temporary Node.js script
cat > setup-admin.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setupAdmin() {
  const uid = 'USER_UID_HERE'; // Replace with actual UID
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`✓ Admin claims set for user ${uid}`);
  process.exit(0);
}

setupAdmin().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
EOF

node setup-admin.js
```

**Or via the Cloud Function endpoint (development only):**

```bash
curl -X POST https://us-central1-hiremeai.cloudfunctions.net/setupInitialAdmin \
  -H "Content-Type: application/json" \
  -d '{"adminEmail":"admin@yourcompany.com"}'
```

## Step 4: Verify Admin Setup

### 4.1 Check Firebase Console

1. Go to Firebase Console → Authentication → Users
2. Click on the admin user
3. Check "Custom Claims" - should show `{ "admin": true }`

### 4.2 Test Admin Endpoint

Get an ID token for the admin user and test:

```bash
# This requires you to authenticate first and get an ID token
curl -X GET "https://us-central1-hiremeai.cloudfunctions.net/getUserInfo?uid=USER_UID" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## Step 5: Configure Environment Variables

### 5.1 Client-side (.env or .env.local)

```env
REACT_APP_FUNCTIONS_URL=https://us-central1-hiremeai.cloudfunctions.net
```

### 5.2 Cloud Functions (.env in functions/)

Created automatically by `firebase functions:config:set`

## Step 6: Test the Setup

### 6.1 Analyze a Sample CV

```bash
# From your client app, call:
analyzeProfileAPI("Sample CV text here...")
```

### 6.2 Check Firestore Rules

Try accessing data:
- Logged-in users should see their own profile
- Logged-in users should NOT see other users' profiles
- Admins should see all data

## Troubleshooting

### "GEMINI_API_KEY is not set in Cloud Functions"

```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
firebase deploy --only functions
```

### "Custom Claims are not appearing in token"

1. Verify custom claims were set:
```bash
firebase auth:export-data.json # Check custom claims
```

2. Have user sign out and back in for token refresh

### "Permission denied" errors in Firestore

1. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
2. Verify user's UID matches in rules
3. Check admin custom claims: `firebase auth:export-data.json`

### CORS errors when calling Cloud Functions

The Cloud Functions already handle CORS, but check:
1. Your `REACT_APP_FUNCTIONS_URL` is correct
2. The function is deployed in the correct region
3. You're sending the Authorization header

## Admin Operations

### Grant Admin Access to New User

Logged-in admin can call:

```typescript
const response = await fetch(
  'https://us-central1-hiremeai.cloudfunctions.net/grantAdminAccess',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`, // Admin's ID token
    },
    body: JSON.stringify({
      newAdminEmail: 'newadmin@company.com'
    })
  }
);
```

### Revoke Admin Access

```typescript
const response = await fetch(
  'https://us-central1-hiremeai.cloudfunctions.net/revokeAdminAccess',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`, // Admin's ID token
    },
    body: JSON.stringify({
      adminEmail: 'admin@company.com'
    })
  }
);
```

## Security Checklist

- [ ] Gemini API key is set in Cloud Functions (not in client code)
- [ ] Firestore rules are deployed and tested
- [ ] Admin users have `admin: true` custom claim
- [ ] Cloud Functions verify auth tokens on all endpoints
- [ ] CORS is configured properly
- [ ] Environment variables are set for production
- [ ] Firebase Security Rules are enabled (not in test mode)
- [ ] Firestore backups are configured
- [ ] Audit logs are enabled

## Monitoring

### Cloud Functions Logs

```bash
firebase functions:log
```

### Firestore Audit Logs

```bash
# In Firebase Console → Firestore → Audit Logs
# Or via Cloud Logging API
gcloud logging read "resource.type=cloud_firestore_database" --limit=50
```

## Rollback Procedure

If something goes wrong:

1. **Revert Firestore Rules:**
   ```bash
   git checkout firestore.rules
   firebase deploy --only firestore:rules
   ```

2. **Disable problematic function:**
   ```bash
   firebase deploy --only functions:analyzeProfile --no-interactive
   ```

3. **Check logs for errors:**
   ```bash
   firebase functions:log --lines=50
   ```

## Next Steps

1. Configure Stripe for payments (Phase 1.3)
2. Implement rate limiting on APIs
3. Set up monitoring and alerting
4. Create user documentation
5. Plan GDPR compliance features

## Support

For issues during setup:
1. Check Cloud Functions logs: `firebase functions:log`
2. Verify Firestore rules: Go to Firebase Console → Firestore → Rules
3. Test with Firebase Emulator Suite: `firebase emulators:start`
4. Review SECURITY.md for architecture details
