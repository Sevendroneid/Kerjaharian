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
    experimental: { passkey: true },
  },
});

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: 'employer' | 'worker' | 'admin';
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
  worker_id: string | null;
  order_id: string | null;
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
  final_amount: number | null;
  payment_status: 'pending' | 'settled' | 'cancelled' | null;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  duration_minutes: number | null;
  overtime_rate_per_minute: number | null;
  started_at: string | null;
  scheduled_end_at: string | null;
  completed_at: string | null;
  overtime_minutes: number;
  overtime_amount: number;
  worker_base_amount: number | null;
  worker_overtime_amount: number | null;
  worker_amount: number | null;
  platform_fee: number;
  protection_fee: number;
  tax_amount: number;
  employer_total: number | null;
  completion_decision: 'finished' | 'continued' | null;
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
