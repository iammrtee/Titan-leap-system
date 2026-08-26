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

-- 5. Create a table for Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'Audit',
  status TEXT DEFAULT 'HOT', -- HOT, WARM, COLD, CONVERTED
  product TEXT,
  score INTEGER DEFAULT 0,
  score_reason TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create a table for Sales/Revenue
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  product_name TEXT,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Disable RLS on tables for prototyping (Enable later for production!)
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions DISABLE ROW LEVEL SECURITY;

-- 8. Create a table for the Content Calendar (Strategy Hub)
-- Mirrors the CalendarItem shape used in StrategyHub.tsx. Scoped by profile_id so
-- multiple client profiles don't overwrite each other's calendars.
CREATE TABLE IF NOT EXISTS calendar_items (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL DEFAULT 'default',
  day INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 0-indexed, matches JS Date
  year INTEGER NOT NULL,
  platform TEXT NOT NULL, -- TikTok / LinkedIn / Instagram / YouTube / Twitter
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled / published / draft
  type TEXT DEFAULT 'post', -- video / article / post
  time TEXT,
  link TEXT,
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_items_profile ON calendar_items(profile_id);

-- Disable RLS for prototyping (matches the other tables above — enable later for production!)
ALTER TABLE calendar_items DISABLE ROW LEVEL SECURITY;
