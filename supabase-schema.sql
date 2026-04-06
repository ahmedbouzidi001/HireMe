-- ==========================================
-- HIREME.AI - SUPABASE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  target_role TEXT,
  experience_years INT,
  skills TEXT[],
  languages TEXT[],
  cv_raw_text TEXT,
  cv_url TEXT,
  employability_score INT,
  profile_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: job_listings
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,
  title TEXT,
  company TEXT,
  location TEXT,
  description TEXT,
  url TEXT,
  source TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- TABLE: job_matches
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id), -- Assuming user_id maps to profiles for simplicity
  job_id UUID REFERENCES job_listings(id),
  ats_score INT,
  matched_keywords TEXT[],
  missing_keywords TEXT[],
  ai_recommendation TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'viewed', 'applied', 'rejected', 'interview'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: generated_documents
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  job_id UUID REFERENCES job_listings(id),
  type TEXT, -- 'cv', 'cover_letter', 'spontaneous'
  content TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE: applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  job_id UUID REFERENCES job_listings(id),
  document_id UUID REFERENCES generated_documents(id),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_status TEXT DEFAULT 'pending', -- 'pending', 'seen', 'interview', 'rejected'
  notes TEXT
);

-- Row Level Security (RLS) Policies (Basic Setup)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own matches" ON job_matches FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own documents" ON generated_documents FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
