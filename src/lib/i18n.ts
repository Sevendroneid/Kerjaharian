export const translations = {
  id: {
    landing: 'Beranda',
    employer: 'Pesan Tenaga Kerja',
    worker: 'Mitra Pekerja',
    signIn: 'Masuk',
    signUp: 'Daftar',
    logout: 'Keluar',
    user: 'Pengguna',
    selectJob: 'Pilih jenis pekerjaan terlebih dahulu.',
    locationRequired: 'Lokasi pengerjaan wajib diisi.',
    minWage: 'Upah min',
    nightShift: 'Shift Malam (+20%)',
    toolAllowance: 'Alat Kerja',
    serviceAndInsurance: 'Biaya & Asuransi',
    total: 'Total',
    baseWage: 'Upah Pokok',
    publish: 'Publikasikan Pesanan',
    activeJobs: 'Pekerjaan Aktif',
    logIn: 'Masuk untuk melihat pesanan.',
    noJobs: 'Tidak ada pekerjaan aktif.',
    categoryLabel: 'Kategori',
    jobType: 'Jenis Pekerjaan',
    details: 'Detail (opsional)',
    location: 'Lokasi Pengerjaan',
    wage: 'Upah',
    csChat: 'CS WA',
  },
  en: {
    landing: 'Home',
    employer: 'Hire Workers',
    worker: 'Worker Network',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    logout: 'Logout',
    user: 'User',
    selectJob: 'Please select job type first.',
    locationRequired: 'Job location is required.',
    minWage: 'Min wage',
    nightShift: 'Night Shift (+20%)',
    toolAllowance: 'Tools',
    serviceAndInsurance: 'Fee & Insurance',
    total: 'Total',
    baseWage: 'Base Wage',
    publish: 'Publish Job',
    activeJobs: 'Active Jobs',
    logIn: 'Sign in to view jobs.',
    noJobs: 'No active jobs.',
    categoryLabel: 'Category',
    jobType: 'Job Type',
    details: 'Details (optional)',
    location: 'Job Location',
    wage: 'Wage',
    csChat: 'CS Chat',
  },
};

export class I18n {
  lang: 'id' | 'en';

  constructor(lang: 'id' | 'en' = 'id') {
    this.lang = lang;
  }

  t(key: keyof typeof translations.id): string {
    return translations[this.lang][key as keyof typeof translations['id']] || key;
  }
}
