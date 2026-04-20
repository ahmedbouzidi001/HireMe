import { auth } from './firebase';
import { UserProfile, JobOffer } from './gemini';

// Replace with your actual Cloud Functions URLs
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
 * Generic fetch wrapper with auth and CORS
 */
async function apiCall<T>(
  endpoint: string,
  method: 'POST' | 'GET' = 'POST',
  data?: any
): Promise<T> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
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
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Analyze CV and extract profile information
 */
export async function analyzeProfileAPI(cvText: string): Promise<UserProfile> {
  const result = await apiCall<{ success: boolean; profile: UserProfile }>(
    'analyzeProfile',
    'POST',
    { cvText }
  );
  return result.profile;
}

/**
 * Search for jobs based on role and location
 */
export async function searchJobsAPI(role: string, location: string): Promise<JobOffer[]> {
  const result = await apiCall<{ success: boolean; jobs: JobOffer[] }>(
    'searchJobs',
    'POST',
    { role, location }
  );
  return result.jobs;
}

/**
 * Score a job match for a profile
 */
export async function scoreJobMatchAPI(profile: UserProfile, job: JobOffer) {
  const result = await apiCall(
    'scoreJobMatch',
    'POST',
    { profile, job }
  );
  return result.atsResult;
}

/**
 * Generate a targeted CV or cover letter
 */
export async function generateDocumentAPI(
  type: 'cv' | 'cover_letter' | 'spontaneous',
  profile: UserProfile,
  job: JobOffer,
  language: 'fr' | 'en' | 'ar' = 'fr'
): Promise<string> {
  const result = await apiCall<{ success: boolean; document: string }>(
    'generateDocument',
    'POST',
    { type, profile, job, language }
  );
  return result.document;
}

/**
 * Get career coach report
 */
export async function getCareerCoachReportAPI(
  profile: UserProfile,
  applications: any[] = []
): Promise<string> {
  const result = await apiCall<{ success: boolean; report: string }>(
    'getCareerCoachReport',
    'POST',
    { profile, applications }
  );
  return result.report;
}

/**
 * Generate LinkedIn optimization suggestions
 */
export async function generateLinkedInOptimizationAPI(profile: UserProfile): Promise<string> {
  const result = await apiCall<{ success: boolean; optimization: string }>(
    'generateLinkedInOptimization',
    'POST',
    { profile }
  );
  return result.optimization;
}

/**
 * Get comprehensive career advice
 */
export async function getCareerAdviceAPI(profile: UserProfile) {
  const result = await apiCall(
    'getCareerAdvice',
    'POST',
    { profile }
  );
  return result.advice;
}

/**
 * Check API health
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
}
