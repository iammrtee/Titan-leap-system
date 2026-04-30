-- Run this in your Supabase SQL Editor

-- 1. Create a table for User Credentials (Settings)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT UNIQUE NOT NULL, -- e.g., 'default'
  twitter_username TEXT,
  twitter_password TEXT,
  instagram_username TEXT,
  instagram_password TEXT,
  linkedin_username TEXT,
  linkedin_password TEXT,
  twitter_token TEXT,
  twitter_refresh_token TEXT,
  linkedin_token TEXT,
  linkedin_refresh_token TEXT,
  facebook_token TEXT,
  facebook_refresh_token TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns just in case the table already exists
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twitter_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS twitter_refresh_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS linkedin_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS facebook_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS facebook_refresh_token TEXT;

-- 2. Create a table for Posts/Drafts
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  caption TEXT,
  platforms JSONB, -- Array of selected platforms e.g., ['ig', 'tw']
  media_urls JSONB, -- Array of Supabase Storage public URLs
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create a Storage Bucket for Media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up Storage Policies (Public Access for Prototyping)
-- Allow public uploads to the 'media' bucket
CREATE POLICY "Public Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
-- Allow public reads from the 'media' bucket
CREATE POLICY "Public Reads" ON storage.objects FOR SELECT USING (bucket_id = 'media');
-- Allow public updates
CREATE POLICY "Public Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
-- Allow public deletes
CREATE POLICY "Public Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- 5. Disable RLS on tables for prototyping (Enable later for production!)
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
