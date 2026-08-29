import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'employer' | 'worker';
  kyc_verified: boolean;
  ktp_photo_url: string | null;
  is_online: boolean;
  rating: number;
  jobs_done: number;
  created_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  category: 'logistik' | 'tukang' | 'kebersihan' | 'serabutan';
  job_type_id: string | null;
  title: string;
  location: string;
  wage: number;
  wage_type: 'hourly' | 'daily';
  estimated_hours: number | null;
  fee: number;
  fee_breakdown: { insurance: number; tax: number; platform: number } | null;
  total: number;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  created_at: string;
  employer?: Profile;
  job_type?: { name: string; description: string | null } | null;
}

export interface JobReport {
  id: string;
  job_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export interface JobType {
  id: string;
  category: 'logistik' | 'tukang' | 'kebersihan' | 'serabutan';
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}
