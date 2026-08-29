import {
  Package,
  Hammer,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceCategory, JobOrder, NearbyWorker } from './types';

export const CATEGORIES: ServiceCategory[] = [
  {
    id: 'logistik',
    label: 'Logistik & Pindahan',
    description: 'Bongkar muat, antar barang, pindahan rumah atau kantor.',
    icon: Package,
    gradient: 'from-primary-500 to-primary-700',
    examples: ['Bongkar muat barang', 'Pindahan rumah', 'Antar furniture'],
  },
  {
    id: 'tukang',
    label: 'Tukang & Renovasi',
    description: 'Tukang bangunan, pasang keramik, perbaikan atap, renovasi.',
    icon: Hammer,
    gradient: 'from-accent-500 to-accent-700',
    examples: ['Pasang keramik', 'Perbaikan atap', 'Bangun partisi'],
  },
  {
    id: 'kebersihan',
    label: 'Jasa Kebersihan Rumah',
    description: 'Cleaning rumah, apartemen, kantor, dan area umum.',
    icon: Sparkles,
    gradient: 'from-success-500 to-success-700',
    examples: ['Cleaning rumah', 'Cuci sofa', 'Kuras AC'],
  },
  {
    id: 'serabutan',
    label: 'Tenaga Serabutan Profesional',
    description: 'Pekerjaan serbaguna untuk kebutuhan harian Anda.',
    icon: Wrench,
    gradient: 'from-slate-600 to-slate-800',
    examples: ['Cat tembok', 'Pasang lampu', 'Perbaikan minor'],
  },
];

export const CATEGORY_MAP: Record<string, ServiceCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

const JOB_SEED: Omit<JobOrder, 'id' | 'postedAt'>[] = [
  { category: 'logistik', categoryLabel: 'Logistik & Pindahan', title: 'Bongkar muat 30 karton dari gudang', employerName: 'Toko Berkah Jaya', location: 'Jl. Mangga Dua, Jakarta Pusat', distanceMeters: 420, wage: 150000 },
  { category: 'tukang', categoryLabel: 'Tukang & Renovasi', title: 'Pasang keramik lantai 40m²', employerName: 'Bpk. Suryanto', location: 'Perumahan Griya Asri, Bekasi', distanceMeters: 1850, wage: 320000 },
  { category: 'kebersihan', categoryLabel: 'Jasa Kebersihan Rumah', title: 'Cleaning rumah 2 lantai pasca renovasi', employerName: 'Ibu Rina', location: 'Bintaro Jaya Sektor 7, Tangerang', distanceMeters: 760, wage: 175000 },
  { category: 'serabutan', categoryLabel: 'Tenaga Serabutan Profesional', title: 'Cat ulang tembok 2 ruangan', employerName: 'Kantor Wijaya', location: 'Jl. HR Rasuna Said, Jakarta Selatan', distanceMeters: 2400, wage: 220000 },
  { category: 'logistik', categoryLabel: 'Logistik & Pindahan', title: 'Pindahan kantor 1 truk', employerName: 'CV Maju Bersama', location: 'Kawasan Industri Pulogadung', distanceMeters: 3100, wage: 400000 },
  { category: 'kebersihan', categoryLabel: 'Jasa Kebersihan Rumah', title: 'Kuras 3 unit AC split', employerName: 'Ibu Dewi', location: 'Apartemen Taman Anggrek, Jakarta Barat', distanceMeters: 980, wage: 135000 },
  { category: 'tukang', categoryLabel: 'Tukang & Renovasi', title: 'Perbaikan atap bocor bagian belakang', employerName: 'Bpk. Hartono', location: 'Jl. Cipinang, Jakarta Timur', distanceMeters: 1500, wage: 185000 },
  { category: 'serabutan', categoryLabel: 'Tenaga Serabutan Profesional', title: 'Pasang 6 titik lampu LED', employerName: 'Warung Kopi Senja', location: 'Jl. Kemang Raya, Jakarta Selatan', distanceMeters: 2750, wage: 160000 },
];

export const SAMPLE_JOBS: JobOrder[] = JOB_SEED.map((j, i) => ({
  ...j,
  id: `job-${i + 1}`,
  postedAt: new Date(Date.now() - (i + 1) * 7 * 60 * 1000),
}));

const WORKER_SEED: Omit<NearbyWorker, 'id' | 'initials'>[] = [
  { name: 'Agus Setiawan', category: 'tukang', rating: 4.9, jobsDone: 128, distanceMeters: 380, verified: true },
  { name: 'Budi Santoso', category: 'logistik', rating: 4.8, jobsDone: 94, distanceMeters: 620, verified: true },
  { name: 'Cipto R.', category: 'kebersihan', rating: 4.7, jobsDone: 67, distanceMeters: 1100, verified: true },
  { name: 'Dedi Pratama', category: 'serabutan', rating: 4.9, jobsDone: 156, distanceMeters: 1450, verified: true },
  { name: 'Eko Wijaya', category: 'tukang', rating: 4.6, jobsDone: 43, distanceMeters: 1900, verified: false },
  { name: 'Fauzan M.', category: 'logistik', rating: 5.0, jobsDone: 211, distanceMeters: 2200, verified: true },
];

export const SAMPLE_WORKERS: NearbyWorker[] = WORKER_SEED.map((w, i) => ({
  ...w,
  id: `worker-${i + 1}`,
  initials: w.name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase(),
}));

export const STATS = [
  { value: '12.000+', label: 'Mitra Pekerja Terdaftar' },
  { value: '34 Kota', label: 'Jangkauan Layanan' },
  { value: '<5 menit', label: 'Rata-rata Waktu Pesan' },
  { value: '4.8/5', label: 'Rating Kepuasan' },
];

export const STEPS = [
  {
    title: 'Pilih Kategori Layanan',
    description: 'Tentukan kebutuhan — logistik, tukang, kebersihan, atau tenaga serabutan.',
  },
  {
    title: 'Tulis Rincian & Lokasi',
    description: 'Jelaskan pekerjaan dan alamat proyek Anda di mana pun di Indonesia.',
  },
  {
    title: 'Publikasikan & Cari Pekerja',
    description: 'Pekerja terdekat menerima panggilan dan menghubungi Anda langsung.',
  },
  {
    title: 'Koordinasi via WhatsApp',
    description: 'Hubungi pekerja secara langsung untuk koordinasi lapangan yang cepat.',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Ibu Rina',
    role: 'Pemilik Rumah, Bintaro',
    quote: 'Pekerja datang dalam waktu 20 menit. Hasil cleaning rumahnya rapi dan profesional.',
    rating: 5,
  },
  {
    name: 'Bpk. Suryanto',
    role: 'Renovasi, Bekasi',
    quote: 'Keramiknya terpasang rapi di hari yang sama. Kalkulator upahnya transparan.',
    rating: 5,
  },
  {
    name: 'CV Maju Bersama',
    role: 'Logistik, Pulogadung',
    quote: 'Pindahan kantor jadi mudah. Pekerjanya kuat dan koordinasinya cepat.',
    rating: 4,
  },
];
