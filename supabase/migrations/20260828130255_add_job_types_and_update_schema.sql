/*
# KerjaHarian — Tabel Jenis Pekerjaan + Update Skema

## Overview
1. Membuat tabel `job_types` yang menyimpan jenis-jenis pekerjaan yang bisa masuk ke 4 kategori
   (logistik, tukang, kebersihan, serabutan). Tabel ini bisa di-update secara mandiri oleh admin
   tanpa mengubah kode aplikasi.
2. Mengisi tabel `job_types` dengan data awal untuk setiap kategori.
3. Menambahkan kolom `ktp_photo_url` di tabel `profiles` untuk menyimpan URL foto KTP.
4. Mengubah kolom `wage` di tabel `jobs` menjadi mendukung upah per jam DAN per hari:
   - Menambah kolom `wage_type` ('hourly' atau 'daily')
   - Menambah kolom `estimated_hours` (perkiraan durasi pekerjaan dalam jam)
5. Mengubah biaya layanan dari 5% menjadi FLAT Rp 15.000 (termasuk asuransi dan pajak):
   - Menambah kolom `fee_breakdown` (JSON) untuk transparansi rincian biaya
   - Fee = Rp 15.000 flat, terdiri dari: asuransi + pajak + biaya platform
6. Menambahkan kolom `job_type_id` di tabel `jobs` untuk link ke `job_types`.

## New Tables

### `job_types`
- `id` (uuid, primary key)
- `category` (text, not null) — 'logistik' | 'tukang' | 'kebersihan' | 'serabutan'
- `name` (text, not null) — nama jenis pekerjaan, contoh: 'Bongkar Muat'
- `description` (text) — penjelasan singkat
- `is_active` (boolean, default true) — bisa di-nonaktifkan tanpa dihapus
- `sort_order` (integer, default 0) — urutan tampil
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Modified Tables

### `profiles`
- TAMBAH: `ktp_photo_url` (text, nullable) — URL foto KTP yang diupload untuk verifikasi KYC

### `jobs`
- TAMBAH: `job_type_id` (uuid, nullable, references job_types) — jenis pekerjaan spesifik
- TAMBAH: `wage_type` (text, not null, default 'daily') — 'hourly' atau 'daily'
- TAMBAH: `estimated_hours` (integer, nullable) — jumlah jam perkiraan (jika hourly)
- UBAH: `fee` sekarang flat Rp 15.000 (bukan 5% lagi)
- TAMBAH: `fee_breakdown` (jsonb) — rincian: {insurance, tax, platform_fee}

## Security
- `job_types`: semua authenticated users bisa baca (dibutuhkan untuk form employer).
  Hanya yang melalui fungsi admin yang bisa insert/update/delete (RLS deny untuk anon/authenticated).
- Kolom `ktp_photo_url` di profiles: bisa diupdate oleh pemilik profil (melalui RLS update_own_profile yang sudah ada).

## Important Notes
1. Tabel `job_types` dirancang untuk auto-update: admin bisa menambah/mengubah jenis pekerjaan
   kapan saja melalui database tanpa mengubah kode frontend. Frontend akan memuat data ini secara
   dinamis dari database.
2. Biaya layanan flat Rp 15.000 sudah termasuk asuransi pekerja dan pajak. Rincian disimpan
   di `fee_breakdown` untuk transparansi penuh.
3. Upah bisa dihitung per jam (hourly) atau per hari (daily). Jika hourly, `estimated_hours`
   menentukan total upah = wage_per_hour * estimated_hours.
*/

-- ============================================================
-- TABEL JOB_TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS job_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('logistik', 'tukang', 'kebersihan', 'serabutan')),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;

-- Semua authenticated users bisa baca job_types (dibutuhkan untuk form employer)
DROP POLICY IF EXISTS "read_all_job_types" ON job_types;
CREATE POLICY "read_all_job_types"
  ON job_types FOR SELECT
  TO authenticated USING (true);

-- Tidak ada policy INSERT/UPDATE/DELETE untuk anon/authenticated
-- (hanya admin/service_role yang bisa mengelola job_types)

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_job_types_category ON job_types(category);
CREATE INDEX IF NOT EXISTS idx_job_types_active ON job_types(is_active) WHERE is_active = true;

-- ============================================================
-- SEED DATA JOB_TYPES
-- ============================================================
INSERT INTO job_types (category, name, description, sort_order) VALUES
-- LOGISTIK & PINDAHAN
('logistik', 'Bongkar Muat Barang', 'Muat dan bongkar barang dari gudang, truk, atau kontainer', 1),
('logistik', 'Pindahan Rumah', 'Pindah perabot dan barang dari rumah ke rumah baru', 2),
('logistik', 'Pindahan Kantor', 'Pindah peralatan kantor dan furniture', 3),
('logistik', 'Antar Furniture', 'Pengiriman furniture jumbo ke alamat tujuan', 4),
('logistik', 'Bongkar Pasar', 'Bongkar muat barang di area pasar tradisional', 5),
-- TUKANG & RENOVASI
('tukang', 'Pasang Keramik', 'Pemasangan keramik lantai dan dinding', 1),
('tukang', 'Perbaikan Atap', 'Perbaikan atap bocor dan genteng', 2),
('tukang', 'Bangun Partisi', 'Pemasangan partisi drywall atau gypsum', 3),
('tukang', 'Cat Tembok', 'Pengecatan dinding dan tembok interior/eksterior', 4),
('tukang', 'Pasang Plafon', 'Pemasangan plafon PVC atau gypsum', 5),
('tukang', 'Renovasi Dapur', 'Renovasi ringan area dapur', 6),
('tukang', 'Perbaikan Sanitair', 'Perbaikan wastafel, kloset, dan pipa air', 7),
-- JASA KEBERSIHAN
('kebersihan', 'Cleaning Rumah', 'Pembersihan menyeluruh rumah termasuk lantai, jendela, kamar mandi', 1),
('kebersihan', 'Cleaning Apartemen', 'Pembersihan apartemen studio hingga 3 kamar', 2),
('kebersihan', 'Cuci Sofa & Kasur', 'Cuci kering sofa, kasur, dan karpet', 3),
('kebersihan', 'Kuras AC', 'Cuci dan kuras unit AC split', 4),
('kebersihan', 'Cleaning Pasca Renovasi', 'Bersih-bersih total setelah renovasi selesai', 5),
('kebersihan', 'Cleaning Kantor', 'Pembersihan rutin area kantor', 6),
-- TENAGA SERABUTAN
('serabutan', 'Pasang Lampu', 'Pemasangan titik lampu LED dan aksesori listrik ringan', 1),
('serabutan', 'Perbaikan Minor', 'Perbaikan ringan pintu, jendela, engsel, dan kunci', 2),
('serabutan', 'Rakit Furniture', 'Perakitan furniture dari toko (IKEA, etc)', 3),
('serabutan', 'Bantu Pindah Barang', 'Bantu angkat dan pindah barang di dalam rumah', 4),
('serabutan', 'Ganti Kunci', 'Ganti dan pasang kunci pintu', 5),
('serabutan', 'Bersih-bersih Taman', 'Pembersihan dan perawatan ringan area taman', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATE TABEL PROFILES: tambah kolom ktp_photo_url
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ktp_photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ktp_photo_url text;
  END IF;
END $$;

-- ============================================================
-- UPDATE TABEL JOBS: tambah kolom baru
-- ============================================================
DO $$
BEGIN
  -- job_type_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_type_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_type_id uuid REFERENCES job_types(id) ON DELETE SET NULL;
  END IF;

  -- wage_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'wage_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN wage_type text NOT NULL DEFAULT 'daily' CHECK (wage_type IN ('hourly', 'daily'));
  END IF;

  -- estimated_hours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE jobs ADD COLUMN estimated_hours integer;
  END IF;

  -- fee_breakdown
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'fee_breakdown'
  ) THEN
    ALTER TABLE jobs ADD COLUMN fee_breakdown jsonb;
  END IF;
END $$;

-- Index untuk job_type_id di jobs
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type_id) WHERE job_type_id IS NOT NULL;

-- ============================================================
-- UPDATE TRIGGER: auto-update updated_at di job_types
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_types_updated ON job_types;
CREATE TRIGGER trg_job_types_updated
  BEFORE UPDATE ON job_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
