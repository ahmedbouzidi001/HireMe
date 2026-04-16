import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * MIGRATION 1: Migrate profiles collection to users/{userId}/profile subcollection
 * Run this once to transition from old structure to new secure structure
 */
export async function migrateProfilesToSubcollection(): Promise<{
  migratedCount: number;
  errors: Array<{ docId: string; error: string }>;
}> {
  console.log('Starting profile migration...');
  
  const migratedCount = { count: 0 };
  const errors: Array<{ docId: string; error: string }> = [];

  try {
    const profilesSnapshot = await db.collection('profiles').get();

    for (const docSnapshot of profilesSnapshot.docs) {
      const docId = docSnapshot.id;
      const profileData = docSnapshot.data();

      try {
        // Copy to new location
        await db
          .collection('users')
          .doc(docId)
          .set({ profile: profileData }, { merge: true });

        // Delete old document
        await db.collection('profiles').doc(docId).delete();

        migratedCount.count++;
        console.log(`✓ Migrated profile for user ${docId}`);
      } catch (error) {
        errors.push({
          docId,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`✗ Failed to migrate profile for user ${docId}:`, error);
      }
    }

    console.log(`Migration complete: ${migratedCount.count} profiles migrated, ${errors.length} errors`);
    return { migratedCount: migratedCount.count, errors };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * MIGRATION 2: Set security indices for better performance
 */
export async function createFirestoreIndices(): Promise<void> {
  console.log('Note: Firestore indices should be created through the Firebase Console');
  console.log('Required indices:');
  console.log('1. Collection: users');
  console.log('   Fields: createdAt (Descending), __name__ (Ascending)');
  console.log('2. Collection: users > searches');
  console.log('   Fields: createdAt (Descending), __name__ (Ascending)');
  console.log('3. Collection: users > matches');
  console.log('   Fields: createdAt (Descending), atsResult.ats_score (Descending)');
}

/**
 * Create migration endpoint
 * Should be called manually or scheduled
 */
export function createMigrationEndpoint(
  functions: typeof import('firebase-functions').default
) {
  return functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Verify auth - should be admin
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if requester is admin
      const user = await admin.auth().getUser(decodedToken.uid);
      if (user.customClaims?.admin !== true) {
        res.status(403).json({ 
          error: 'Only admins can run migrations' 
        });
        return;
      }

      const { migrationName } = req.body;

      if (!migrationName) {
        res.status(400).json({ 
          error: 'migrationName is required',
          available: ['migrateProfilesToSubcollection', 'createFirestoreIndices']
        });
        return;
      }

      let result;
      switch (migrationName) {
        case 'migrateProfilesToSubcollection':
          result = await migrateProfilesToSubcollection();
          break;
        case 'createFirestoreIndices':
          await createFirestoreIndices();
          result = { message: 'Check Cloud Functions logs for required indices' };
          break;
        default:
          res.status(400).json({ error: `Unknown migration: ${migrationName}` });
          return;
      }

      res.json({ success: true, migration: migrationName, result });

    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
