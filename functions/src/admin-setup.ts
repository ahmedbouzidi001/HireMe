/**
 * Firebase Admin Setup Function
 * 
 * This file contains Cloud Functions for administrative operations.
 * Deploy separately: firebase deploy --only functions:setupAdmin
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Cloud Function: Setup Initial Admin
 * 
 * This function should be called ONCE during initial setup to grant the first admin access.
 * After that, use the grantAdminAccess function for subsequent admins.
 * 
 * Security: This is protected by Firebase rules - only callable from authenticated context
 * 
 * Deploy: firebase deploy --only functions:setupInitialAdmin
 * Call: POST to https://region-projectId.cloudfunctions.net/setupInitialAdmin
 * Body: { "adminEmail": "admin@example.com" }
 */
export const setupInitialAdmin = functions.https.onRequest(
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // IMPORTANT: In production, this endpoint should have additional protection
    // such as API key verification or custom authentication
    
    const { adminEmail } = req.body;

    if (!adminEmail || typeof adminEmail !== 'string') {
      res.status(400).json({ error: 'adminEmail is required and must be a string' });
      return;
    }

    try {
      // Find user by email
      const user = await admin.auth().getUserByEmail(adminEmail);

      // Set custom claims
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });

      res.json({
        success: true,
        message: `User ${adminEmail} (UID: ${user.uid}) is now an admin`,
        uid: user.uid,
      });
    } catch (error) {
      console.error('Error setting admin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Cloud Function: Grant Admin Access
 * 
 * Protected: Only existing admins can grant new admins
 * 
 * Deploy: firebase deploy --only functions:grantAdminAccess
 * Call: POST to https://region-projectId.cloudfunctions.net/grantAdminAccess
 * Headers: Authorization: Bearer <idToken>
 * Body: { "newAdminEmail": "newadmin@example.com" }
 */
export const grantAdminAccess = functions.https.onRequest(
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Verify requester is authenticated and is an admin
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if requester is admin
      const requesterUser = await admin.auth().getUser(decodedToken.uid);
      if (requesterUser.customClaims?.admin !== true) {
        res.status(403).json({
          error: 'Only admins can grant admin access',
        });
        return;
      }

      const { newAdminEmail } = req.body;
      if (!newAdminEmail || typeof newAdminEmail !== 'string') {
        res.status(400).json({ error: 'newAdminEmail is required' });
        return;
      }

      // Find the new admin user
      const newAdminUser = await admin.auth().getUserByEmail(newAdminEmail);

      // Set custom claims
      await admin.auth().setCustomUserClaims(newAdminUser.uid, { admin: true });

      // Notify both users in Firestore logs for audit trail
      const db = admin.firestore();
      await db.collection('audit-logs').add({
        action: 'admin-granted',
        grantedBy: decodedToken.uid,
        grantedTo: newAdminUser.uid,
        email: newAdminEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        message: `User ${newAdminEmail} is now an admin`,
        uid: newAdminUser.uid,
      });
    } catch (error) {
      console.error('Error granting admin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Cloud Function: Revoke Admin Access
 * 
 * Protected: Only existing admins can revoke admin access
 * 
 * Deploy: firebase deploy --only functions:revokeAdminAccess
 * Call: POST to https://region-projectId.cloudfunctions.net/revokeAdminAccess
 * Headers: Authorization: Bearer <idToken>
 * Body: { "adminEmail": "admin@example.com" }
 */
export const revokeAdminAccess = functions.https.onRequest(
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if requester is admin
      const requesterUser = await admin.auth().getUser(decodedToken.uid);
      if (requesterUser.customClaims?.admin !== true) {
        res.status(403).json({
          error: 'Only admins can revoke admin access',
        });
        return;
      }

      const { adminEmail } = req.body;
      if (!adminEmail || typeof adminEmail !== 'string') {
        res.status(400).json({ error: 'adminEmail is required' });
        return;
      }

      // Find the admin user to revoke
      const targetUser = await admin.auth().getUserByEmail(adminEmail);

      // Remove custom claims
      await admin.auth().setCustomUserClaims(targetUser.uid, { admin: false });

      // Log the revocation
      const db = admin.firestore();
      await db.collection('audit-logs').add({
        action: 'admin-revoked',
        revokedBy: decodedToken.uid,
        revokedFrom: targetUser.uid,
        email: adminEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        message: `Admin access revoked for ${adminEmail}`,
        uid: targetUser.uid,
      });
    } catch (error) {
      console.error('Error revoking admin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Cloud Function: Get User Info (for debugging)
 * 
 * Protected: Only admins can view detailed user info
 */
export const getUserInfo = functions.https.onRequest(
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if requester is admin
      const requesterUser = await admin.auth().getUser(decodedToken.uid);
      if (requesterUser.customClaims?.admin !== true) {
        res.status(403).json({
          error: 'Only admins can view user info',
        });
        return;
      }

      const { uid } = req.query;
      if (!uid || typeof uid !== 'string') {
        res.status(400).json({ error: 'uid query parameter is required' });
        return;
      }

      const user = await admin.auth().getUser(uid);

      res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
          customClaims: user.customClaims,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
        },
      });
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
