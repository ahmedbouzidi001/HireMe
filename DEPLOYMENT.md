# HireMe.ai Deployment Guide

## Overview

This guide covers deploying HireMe.ai to Firebase Hosting, Google Cloud Functions, and Firestore. The application follows a serverless architecture with modern security best practices.

## Prerequisites

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init
```

## Environment Variables

### Production Environment (Firebase)

Set these in Firebase Console > Project Settings > Environment Variables:

```env
# Frontend (Vite)
VITE_API_URL=https://api.hiremeai.com
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=hiremeai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hireme-prod
VITE_FIREBASE_STORAGE_BUCKET=hireme-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_GEMINI_API_KEY=xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Backend (Cloud Functions)
GEMINI_API_KEY=xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SENDGRID_API_KEY=xxx
JWT_SECRET=generated-secret-key
```

## Deployment Steps

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build Vite application
npm run build

# Verify build output
ls -la dist/
```

### 2. Firebase Configuration

Update `firebase.json`:

```json
{
  "hosting": {
    "site": "hiremeai",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "codebase": "default"
  }
}
```

### 3. Deploy to Firebase Hosting

```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions and hosting
firebase deploy

# Deploy specific function
firebase deploy --only functions:analyzeProfile
```

### 4. Post-Deployment

```bash
# Check deployment status
firebase hosting:list

# View logs
firebase functions:log

# Check traffic
firebase hosting:channel:list
```

## Cloud Functions Deployment

### 1. Deploy Gemini API Function

```bash
cd functions

# Install dependencies
npm install

# Deploy
firebase deploy --only functions:analyzeProfile

# Test function
curl -X POST https://region-hireme-prod.cloudfunctions.net/analyzeProfile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{"cv_text": "..."}'
```

### 2. Stripe Webhook Function

```bash
# Deploy webhook handler
firebase deploy --only functions:stripeWebhook

# Test webhook
curl -X POST https://region-hireme-prod.cloudfunctions.net/stripeWebhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: $SIGNATURE" \
  -d '{"type": "charge.succeeded"}'
```

## Firestore Database

### 1. Create Collections

```bash
# Collections are created automatically on first document write
# Use Firestore Console to create indexes for:

1. users collection
   - Composite Index: (uid, createdAt)
   - Single Field Index: email (Ascending)

2. applications collection
   - Composite Index: (user_id, atsScore) for sorting
   - Single Field Index: status (Ascending)

3. matches collection
   - Composite Index: (user_id, createdAt)
```

### 2. Enable Firestore Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules
```

See `SECURITY.md` for complete Firestore Rules.

### 3. Backup Strategy

```bash
# Enable backups in Firebase Console
# Settings > Backups > Enable automated backups

# Manual backup
gcloud firestore export gs://hireme-prod-backups/backup-$(date +%Y%m%d)
```

## Firebase Authentication

### 1. Email/Password Auth

Already enabled by default. Configure in Firebase Console:
- Authentication > Sign-in method > Email/Password
- Enable password strength requirements
- Set session duration (30 days)

### 2. Multi-factor Authentication

```bash
# Enable in Firebase Console
# Authentication > Settings > User actions > Enable MFA

# Or via Firebase CLI
firebase auth:set-log-level debug
```

### 3. Custom Claims

Admin users get custom claim:
```typescript
// In Admin SDK (Cloud Functions)
admin.auth().setCustomUserClaims(uid, {
  admin: true,
  atsScore: score
});
```

## Monitoring & Logging

### 1. Firebase Monitoring

Access via:
- Firebase Console > Analytics
- Firebase Console > Performance Monitoring
- Firebase Console > Crash Reporting

### 2. Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_function" --limit 50

# Watch logs in real-time
gcloud logging read "resource.type=cloud_function" \
  --streaming-logs \
  --format json
```

### 3. Cloud Trace

Enable in Google Cloud Console:
- Trace API > Enable
- Cloud Functions will auto-trace

## Security Checklist

### Before Production Deploy

- [ ] All environment variables set securely
- [ ] Firestore Rules validated
- [ ] Cloud Functions authenticated with custom claims
- [ ] Stripe webhook secret configured
- [ ] CORS configured for allowed origins
- [ ] SSL/TLS enabled (auto with Firebase Hosting)
- [ ] Security headers set (done in firebase.json)
- [ ] Rate limiting configured on Cloud Functions
- [ ] API keys restricted to specific services
- [ ] Sensitive data encrypted in Firestore
- [ ] Backup strategy enabled
- [ ] Monitoring dashboards created

### Security Headers

These are automatically set in `firebase.json`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

## Scaling & Performance

### 1. Firebase Hosting CDN

- Automatic global distribution
- 150+ edge locations
- Automatic DDoS protection

### 2. Cloud Functions Scaling

Configure in `firebase.json`:

```json
{
  "functions": {
    "memory": 512,
    "timeoutSeconds": 60,
    "maxInstances": 100
  }
}
```

### 3. Firestore Optimization

- Enable automatic backups
- Use composite indexes for complex queries
- Monitor read/write operations
- Scale database mode if needed (Datastore mode)

## Rollback Procedure

```bash
# List deployment history
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:releases:rollback

# Deploy specific version
firebase deploy --message "Production release v2.1.0"
```

## Continuous Integration

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Monitoring Dashboard

### Key Metrics to Track

1. **Performance**
   - Page load time (target: <2.5s)
   - API response time (target: <500ms)
   - Database query time (target: <100ms)

2. **Availability**
   - Uptime %age (target: >99.9%)
   - Error rate (target: <0.1%)
   - Function cold starts (target: <2s)

3. **Usage**
   - Daily active users
   - API calls per minute
   - Database reads/writes
   - Function invocations

4. **Security**
   - Failed auth attempts
   - Unauthorized API calls
   - RLS policy violations
   - Firestore write denials

### Alerts to Set Up

```bash
# CPU high alert
gcloud monitoring policies create \
  --notification-channels CHANNEL_ID \
  --display-name "High CPU Usage"

# Error rate alert
gcloud monitoring policies create \
  --notification-channels CHANNEL_ID \
  --display-name "High Error Rate"
```

## Troubleshooting

### Issue: CORS Errors

**Solution**: Update Cloud Functions headers:

```typescript
const cors = require('cors')({ origin: true });

exports.analyzeProfile = functions.https.onCall((data, context) => {
  return cors(request, response, () => {
    // Handler
  });
});
```

### Issue: Slow Function Startup

**Solution**: Increase memory allocation in `firebase.json`:

```json
{
  "functions": {
    "memory": 1024,
    "timeoutSeconds": 120
  }
}
```

### Issue: High Firestore Costs

**Solution**: 
- Add composite indexes for common queries
- Reduce document read frequency
- Use document snapshots cache
- Enable Firestore backup instead of manual exports

### Issue: Authentication Errors

**Solution**: Check custom claims:

```bash
firebase auth:export users.json
# Verify custom claims in exported file
```

## Disaster Recovery

### Backup Restore

```bash
# Restore from backup
gcloud firestore restore gs://hireme-prod-backups/backup-20260416

# Verify restore completed
gcloud firestore operations list
```

### Database Migration

If migrating from old Firestore instance:

```bash
# Export old database
gcloud firestore export gs://old-backup/export

# Restore to new database
gcloud firestore restore gs://old-backup/export
```

## Support & Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Functions Guide](https://cloud.google.com/functions/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Google Cloud Console](https://console.cloud.google.com)
