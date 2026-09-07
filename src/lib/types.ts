import type { LucideIcon } from 'lucide-react';

export type View = 'landing' | 'worker' | 'employer' | 'admin' | 'privacy' | 'terms' | 'help';

export type CategoryId = 'logistik' | 'tukang' | 'kebersihan' | 'serabutan';

export type WageType = 'hourly' | 'daily';

export interface ServiceCategory {
  id: CategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  examples: string[];
}

export interface JobType {
  id: string;
  category: CategoryId;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface JobOrder {
  id: string;
  category: CategoryId;
  categoryLabel: string;
  title: string;
  employerName: string;
  location: string;
  distanceMeters: number;
  wage: number;
  postedAt: Date;
}

export interface NearbyWorker {
  id: string;
  name: string;
  category: CategoryId;
  rating: number;
  jobsDone: number;
  distanceMeters: number;
  initials: string;
  verified: boolean;
}

export interface PublishedJob {
  id: string;
  category: CategoryId;
  categoryLabel: string;
  title: string;
  location: string;
  wage: number;
  fee: number;
  total: number;
  createdAt: Date;
}
