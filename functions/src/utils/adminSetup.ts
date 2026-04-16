import * as admin from 'firebase-admin';

/**
 * Set a user as admin using Custom Claims
 * This should be called from a secure endpoint or manually during setup
 * 
 * Usage:
 * - Call this function from a Cloud Function endpoint protected by authentication
 * - Only actual admins should have access to this endpoint
 */
export async function setUserAsAdmin(uid: string): Promise<void> {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✓ User ${uid} set as admin`);
  } catch (error) {
    console.error(`✗ Failed to set admin for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Remove admin status from a user
 */
export async function removeAdminStatus(uid: string): Promise<void> {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: false });
    console.log(`✓ Admin status removed for user ${uid}`);
  } catch (error) {
    console.error(`✗ Failed to remove admin for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Get user's custom claims
 */
export async function getUserClaims(uid: string): Promise<any> {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims;
  } catch (error) {
    console.error(`✗ Failed to get claims for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Verify if a user is admin (server-side check)
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const claims = await getUserClaims(uid);
    return claims?.admin === true;
  } catch {
    return false;
  }
}

/**
 * Setup endpoint for granting admin access
 * This should be protected by authentication and firestore rules
 */
export function createAdminSetupEndpoint(
  functions: typeof import('firebase-functions').default
) {
  return functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Verify auth
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if requester is already admin
      const requesterClaims = await getUserClaims(decodedToken.uid);
      if (requesterClaims?.admin !== true) {
        res.status(403).json({ 
          error: 'Only admins can grant admin access' 
        });
        return;
      }

      const { uid } = req.body;
      if (!uid || typeof uid !== 'string') {
        res.status(400).json({ error: 'uid is required and must be a string' });
        return;
      }

      // Grant admin access
      await setUserAsAdmin(uid);
      res.json({ success: true, message: `User ${uid} is now an admin` });

    } catch (error) {
      console.error('Error in admin setup:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
