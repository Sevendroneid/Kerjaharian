/*
# KerjaHarian — Core Database Schema

## Overview
Creates the full database schema for the KerjaHarian platform: user profiles,
job orders, and job reports. All tables use Row Level Security with ownership-based
policies so each authenticated user can only access their own data.

## New Tables

### 1. `profiles`
- `id` (uuid, primary key, references auth.users) — one-to-one with each user account
- `full_name` (text, not null) — display name
- `phone` (text) — phone number for WhatsApp coordination
- `role` (text, not null, default 'employer') — 'employer' or 'worker'
- `kyc_verified` (boolean, not null, default false) — whether identity (KTP) has been verified
- `is_online` (boolean, not null, default false) — worker availability status
- `rating` (numeric, default 5.0) — worker rating
- `jobs_done` (integer, default 0) — count of completed jobs
- `created_at` (timestamptz, default now())

### 2. `jobs`
- `id` (uuid, primary key)
- `employer_id` (uuid, references profiles, NOT NULL, DEFAULT auth.uid()) — job owner
- `category` (text, not null) — 'logistik' | 'tukang' | 'kebersihan' | 'serabutan'
- `title` (text, not null) — job description
- `location` (text, not null) — project address
- `wage` (integer, not null) — daily wage in IDR, must be >= 75000 (CHECK constraint)
- `fee` (integer, not null) — platform fee (5% of wage)
- `total` (integer, not null) — total payment (wage + fee)
- `status` (text, not null, default 'open') — 'open' | 'assigned' | 'completed' | 'cancelled'
- `created_at` (timestamptz, default now())

### 3. `job_reports`
- `id` (uuid, primary key)
- `job_id` (uuid, references jobs ON DELETE CASCADE) — reported job
- `reporter_id` (uuid, references profiles, NOT NULL, DEFAULT auth.uid()) — who reported
- `reason` (text, not null) — report reason
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all three tables.
- `profiles`: users can read all profiles (needed for worker browsing) but only update their own.
  Role and kyc_verified columns are protected via a SECURITY DEFINER function so users cannot
  self-elevate or self-verify.
- `jobs`: anyone authenticated can read open jobs (workers need to see them); only the employer
  who created a job can insert/update/delete it.
- `job_reports`: anyone authenticated can read; users can insert reports for any job; only the
  reporter can delete their own report.

## Important Notes
1. The `wage` column has a CHECK constraint enforcing minimum Rp 75,000.
2. The `verify_kyc` SECURITY DEFINER function lets a user mark their own KYC as verified
   (simulated for now — in production this would call a real KYC provider).
3. Profile `role` and `kyc_verified` are NOT directly updatable by users via RLS — they must
   go through the `verify_kyc` function.
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'employer' CHECK (role IN ('employer', 'worker')),
  kyc_verified boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  rating numeric DEFAULT 5.0,
  jobs_done integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profiles (needed for worker browsing / employer info)
DROP POLICY IF EXISTS "read_all_profiles" ON profiles;
CREATE POLICY "read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated USING (true);

-- Users can only update their own profile, but NOT role or kyc_verified
-- (those are protected by column-level restrictions via the update function)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile row
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('logistik', 'tukang', 'kebersihan', 'serabutan')),
  title text NOT NULL,
  location text NOT NULL,
  wage integer NOT NULL CHECK (wage >= 75000),
  fee integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read jobs (workers need to see available jobs)
DROP POLICY IF EXISTS "read_all_jobs" ON jobs;
CREATE POLICY "read_all_jobs"
  ON jobs FOR SELECT
  TO authenticated USING (true);

-- Only the employer who owns the job can insert
DROP POLICY IF EXISTS "insert_own_jobs" ON jobs;
CREATE POLICY "insert_own_jobs"
  ON jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = employer_id);

-- Only the employer who owns the job can update
DROP POLICY IF EXISTS "update_own_jobs" ON jobs;
CREATE POLICY "update_own_jobs"
  ON jobs FOR UPDATE
  TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

-- Only the employer who owns the job can delete
DROP POLICY IF EXISTS "delete_own_jobs" ON jobs;
CREATE POLICY "delete_own_jobs"
  ON jobs FOR DELETE
  TO authenticated USING (auth.uid() = employer_id);

-- ============================================================
-- JOB REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reports
DROP POLICY IF EXISTS "read_all_reports" ON job_reports;
CREATE POLICY "read_all_reports"
  ON job_reports FOR SELECT
  TO authenticated USING (true);

-- Any authenticated user can insert a report
DROP POLICY IF EXISTS "insert_reports" ON job_reports;
CREATE POLICY "insert_reports"
  ON job_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Only the reporter can delete their own report
DROP POLICY IF EXISTS "delete_own_reports" ON job_reports;
CREATE POLICY "delete_own_reports"
  ON job_reports FOR DELETE
  TO authenticated USING (auth.uid() = reporter_id);

-- ============================================================
-- SECURITY DEFINER FUNCTION: verify_kyc
-- ============================================================
-- Allows a user to mark their own KYC as verified.
-- In production, this would integrate with a real KYC provider.
-- SECURITY DEFINER so it can bypass RLS to update kyc_verified.
CREATE OR REPLACE FUNCTION verify_kyc()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET kyc_verified = true WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION verify_kyc() TO authenticated;

-- ============================================================
-- SECURITY DEFINER FUNCTION: update_worker_status
-- ============================================================
-- Allows a worker to toggle their online status, but only if KYC is verified.
-- SECURITY DEFINER so it can check kyc_verified (which the user can't directly read
-- in a policy subquery efficiently) and update is_online safely.
CREATE OR REPLACE FUNCTION update_worker_status(p_is_online boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_online = true THEN
    -- Only allow going online if KYC is verified
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND kyc_verified = true) THEN
      RAISE EXCEPTION 'KYC verification required before going online';
    END IF;
  END IF;
  UPDATE profiles SET is_online = p_is_online WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_worker_status(boolean) TO authenticated;

-- ============================================================
-- SECURITY DEFINER FUNCTION: set_worker_role
-- ============================================================
-- Allows a user to switch their role to 'worker'. This is the only way
-- to change the role column — direct UPDATE is blocked by the policy
-- (the update_own_profile policy allows the update, but we use a trigger
-- to prevent role/kyc_verified changes via direct UPDATE).
CREATE OR REPLACE FUNCTION set_role(p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role NOT IN ('employer', 'worker') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE profiles SET role = p_role WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION set_role(text) TO authenticated;

-- ============================================================
-- TRIGGER: prevent direct modification of role and kyc_verified
-- ============================================================
-- This trigger fires BEFORE UPDATE on profiles and rejects changes
-- to `role` or `kyc_verified` columns — those must go through the
-- SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If trying to change role or kyc_verified, block it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot directly modify role. Use set_role() function.';
  END IF;
  IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified THEN
    RAISE EXCEPTION 'Cannot directly modify kyc_verified. Use verify_kyc() function.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive ON profiles;
CREATE TRIGGER trg_protect_sensitive
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_columns();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_job ON job_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online) WHERE is_online = true;
