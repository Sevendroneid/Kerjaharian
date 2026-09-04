-- KerjaHarian: expand the job catalog with research metadata and admin CRUD.
ALTER TABLE public.job_prices
  ADD COLUMN IF NOT EXISTS category_label text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS location_scope text,
  ADD COLUMN IF NOT EXISTS pay_unit text,
  ADD COLUMN IF NOT EXISTS duration_label text,
  ADD COLUMN IF NOT EXISTS contract_duration text,
  ADD COLUMN IF NOT EXISTS source_system text;

UPDATE public.job_prices
SET category_label = COALESCE(category_label, category_id),
    pay_unit = COALESCE(pay_unit, unit),
    duration_label = COALESCE(duration_label, CASE WHEN duration_minutes IS NULL THEN NULL ELSE (duration_minutes / 60)::text || ' jam' END),
    source_system = COALESCE(source_system, 'KerjaHarian legacy catalog')
WHERE category_label IS NULL OR pay_unit IS NULL OR duration_label IS NULL OR source_system IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_prices_catalog_active ON public.job_prices(category_id, is_active, job_name);

CREATE OR REPLACE FUNCTION public.admin_list_job_catalog()
RETURNS SETOF public.job_prices
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT jp.* FROM public.job_prices jp
  WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ORDER BY jp.is_active DESC, jp.category_id, jp.job_name;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_job_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_job_catalog(
  p_job_price_id uuid, p_category_id text, p_category_label text, p_job_name text, p_slug text,
  p_description text, p_location_scope text, p_base_price integer, p_minimum_price integer,
  p_unit text, p_pay_unit text, p_duration_minutes integer, p_duration_label text,
  p_contract_duration text, p_overtime_rate_per_minute integer, p_source_system text,
  p_tier smallint, p_is_active boolean
)
RETURNS public.job_prices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.job_prices;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  IF NULLIF(btrim(p_job_name), '') IS NULL THEN RAISE EXCEPTION 'Nama pekerjaan wajib diisi'; END IF;
  IF NULLIF(btrim(p_slug), '') IS NULL THEN RAISE EXCEPTION 'Slug wajib diisi'; END IF;
  IF p_base_price <= 0 THEN RAISE EXCEPTION 'Harga harus lebih dari 0'; END IF;
  IF p_minimum_price < 0 OR p_base_price < p_minimum_price THEN RAISE EXCEPTION 'Minimum harga tidak valid'; END IF;
  IF p_duration_minutes <= 0 THEN RAISE EXCEPTION 'Durasi harus lebih dari 0 menit'; END IF;
  IF p_overtime_rate_per_minute < 0 THEN RAISE EXCEPTION 'Tarif overtime tidak boleh negatif'; END IF;
  IF p_tier < 1 OR p_tier > 4 THEN RAISE EXCEPTION 'Tier harus 1-4'; END IF;
  UPDATE public.job_prices SET
    category_id=btrim(p_category_id), category_label=NULLIF(btrim(p_category_label), ''), job_name=btrim(p_job_name),
    slug=lower(regexp_replace(btrim(p_slug), '[^a-zA-Z0-9]+', '-', 'g')), description=NULLIF(btrim(p_description), ''),
    location_scope=NULLIF(btrim(p_location_scope), ''), base_price=p_base_price, minimum_price=p_minimum_price,
    unit=NULLIF(btrim(p_unit), ''), pay_unit=NULLIF(btrim(p_pay_unit), ''), duration_minutes=p_duration_minutes,
    duration_label=NULLIF(btrim(p_duration_label), ''), contract_duration=NULLIF(btrim(p_contract_duration), ''),
    overtime_rate_per_minute=p_overtime_rate_per_minute, source_system=NULLIF(btrim(p_source_system), ''),
    tier=p_tier, is_active=p_is_active, last_researched_at=now()
  WHERE id=p_job_price_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  RETURN v_row;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Slug pekerjaan sudah digunakan';
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_job_catalog(uuid,text,text,text,text,text,text,integer,integer,text,text,integer,text,text,integer,text,smallint,boolean) TO authenticated;

-- Research baseline catalog. category_id stays within the app's current operational categories
-- so the existing order -> jobs mapping remains compatible.
INSERT INTO public.job_prices (
  category_id, category_label, job_name, slug, tier, base_price, unit, pay_unit, description, location_scope,
  duration_minutes, duration_label, contract_duration, overtime_rate_per_minute, minimum_price, source_system, is_active, last_researched_at
) VALUES
('logistik','Logistik & Pasar','Kuli Panggul Pasar','kuli-panggul-pasar',1,200000,'day','Per Hari','Bongkar muat komoditas sembako dan sayuran dari truk ke toko.','Penjaringan, Jakarta Utara',480,'8 jam','Panggilan Harian (Lepas)',625,200000,'Riset Claude / baseline 2026',true,now()),
('renovasi','Konstruksi','Kenek / Helper Tukang Bangunan','kenek-helper-tukang-bangunan',1,150000,'day','Per Hari','Pengadukan semen, pengangkutan batu bata, dan persiapan material.','Jabodetabek',480,'8 jam','Harian / Proyekan (1-4 Minggu)',469,150000,'Riset Claude / baseline 2026',true,now()),
('renovasi','Konstruksi','Tukang Batu & Gali Tanah','tukang-batu-gali-tanah',3,180000,'day','Per Hari','Penggalian pondasi, pemasangan batu kali, dan pengerjaan dinding.','Jabodetabek',480,'8 jam','Harian / Proyekan (2-8 Minggu)',563,180000,'Riset Claude / baseline 2026',true,now()),
('logistik','Warehousing','Helper Gudang & Packing','helper-gudang-packing',1,100000,'day','Per Hari','Bongkar barang masuk, penataan stok, dan penyusunan dus barang.','Cikarang / Bekasi',480,'8 jam','Harian Lepas (Shift 8 Jam)',313,100000,'Riset Claude / baseline 2026',true,now()),
('kebersihan','F&B','Kitchen Helper / Cuci Piring (Steward)','kitchen-helper-cuci-piring',1,80000,'day','Per Hari','Mencuci peralatan masak, membersihkan dapur, dan membantu persiapan bahan.','Tangerang Kota',480,'8 jam','Shift Harian (8-10 Jam)',250,80000,'Riset Claude / baseline 2026',true,now()),
('kebersihan','Jasa / Kebersihan','Helper Freelance Laundry','helper-freelance-laundry',1,60000,'day','Per Hari','Pengeringan, melipat pakaian, menyortir, dan mengangkat cucian.','Jatiasih, Bekasi',300,'5 jam','Part-time Harian (4-6 Jam)',300,60000,'Riset Claude / baseline 2026',true,now()),
('serabutan','Manufaktur','Buruh Pabrik Packing','buruh-pabrik-packing',1,86500,'day','Per Hari','Pembungkusan produk, pemeriksaan sederhana, dan penataan kardus.','Sidoarjo, Jawa Timur',480,'8 jam','Harian / Kontrak 3-6 Bulan',271,86500,'Riset Claude / konversi Rp2.250.000/26 hari',true,now()),
('serabutan','Pertamanan / Lanskap','Tenaga Kebun / Daily Worker','tenaga-kebun-daily-worker',1,96000,'day','Per Hari','Babat rumput, membersihkan lahan, menyiram, dan memangkas tanaman.','Tabanan, Bali',480,'8 jam','Harian / Kontrak Bulanan',300,96000,'Riset Claude / konversi Rp2.500.000/26 hari',true,now()),
('logistik','Ritel & Material','Kuli Angkat Toko Material','kuli-angkat-toko-material',1,25000,'hour','Per Jam','Memuat semen, pasir, besi, keramik, dan material ke kendaraan konsumen.','Tambora, Jakarta Barat',60,'1 jam','Hourly / Panggilan',625,25000,'Riset Claude / baseline 2026',true,now()),
('serabutan','Jasa / Otomotif','Helper Teknisi AC / Bengkel','helper-teknisi-ac-bengkel',2,120000,'day','Per Hari','Membawa peralatan teknisi, membantu pekerjaan lapangan, dan membersihkan unit.','Cipondoh, Tangerang',480,'8 jam','Harian (Panggilan Proyek)',375,120000,'Riset Claude / baseline 2026',true,now()),
('logistik','Logistik','Buruh Bongkar Muat Truk','buruh-bongkar-muat-truk',1,150000,'day','Per Hari','Membongkar dan memindahkan barang dari truk ke gudang atau toko.','Jakarta / Bekasi / Tangerang',480,'8 jam','Panggilan 1 Hari',469,150000,'KerjaHarian baseline 2026',true,now()),
('logistik','Jasa Angkut','Helper Pindahan Rumah','helper-pindahan-rumah',1,150000,'day','Per Hari','Mengangkat, membawa, dan menata barang saat proses pindahan.','Jabodetabek',480,'8 jam','Panggilan 1 Hari',469,150000,'KerjaHarian baseline 2026',true,now()),
('logistik','Jasa Angkut','Buruh Angkut Furniture','buruh-angkut-furniture',1,150000,'day','Per Hari','Mengangkat lemari, meja, kasur, sofa, dan furniture lainnya.','Jabodetabek',480,'8 jam','Panggilan 1 Hari',469,150000,'KerjaHarian baseline 2026',true,now()),
('logistik','Logistik','Helper Ekspedisi','helper-ekspedisi',1,110000,'day','Per Hari','Menyortir paket, memindahkan barang, dan membantu proses loading kendaraan.','Jakarta / Bekasi / Tangerang',480,'8 jam','Shift Harian 8 Jam',344,110000,'KerjaHarian baseline 2026',true,now()),
('logistik','Gudang & Logistik','Picker Gudang','picker-gudang',1,110000,'day','Per Hari','Mengambil barang berdasarkan pesanan dan menyiapkannya untuk packing.','Bekasi / Cikarang',480,'8 jam','Shift Harian 8 Jam',344,110000,'KerjaHarian baseline 2026',true,now()),
('logistik','Gudang & Logistik','Sorter Paket','sorter-paket',1,100000,'day','Per Hari','Memilah paket berdasarkan wilayah, kode, atau rute pengiriman.','Jakarta / Bekasi',480,'8 jam','Shift Harian 8 Jam',313,100000,'KerjaHarian baseline 2026',true,now()),
('logistik','Logistik','Crew Loading Barang','crew-loading-barang',1,120000,'day','Per Hari','Membantu menaikkan dan menurunkan barang dari kendaraan distribusi.','Jabodetabek',480,'8 jam','Panggilan Harian',375,120000,'KerjaHarian baseline 2026',true,now()),
('logistik','Pengiriman','Kurir Motor Harian (Baseline 2026)','kurir-motor-harian-baseline',1,150000,'day','Per Hari','Mengambil dan mengantarkan barang atau dokumen sesuai rute yang diberikan.','Jakarta Selatan / Jakarta Pusat',480,'8 jam','Harian / Panggilan',469,150000,'Riset Claude / baseline 2026',true,now()),
('logistik','Transportasi','Helper Driver','helper-driver',1,130000,'day','Per Hari','Membantu driver membawa barang, melakukan loading, dan unloading.','Jabodetabek',480,'8 jam','Harian / Perjalanan',407,130000,'KerjaHarian baseline 2026',true,now()),
('kebersihan','Kebersihan','Petugas Kebersihan Rumah','petugas-kebersihan-rumah',1,100000,'day','Per Hari','Menyapu, mengepel, membersihkan kamar mandi, dan merapikan rumah.','Jabodetabek',480,'8 jam','Panggilan 1 Hari',313,100000,'KerjaHarian baseline 2026',true,now()),
('kebersihan','Kebersihan','Cleaning Service Kantor','cleaning-service-kantor',1,100000,'day','Per Hari','Membersihkan area kantor, lantai, toilet, dan fasilitas umum.','Jakarta / Tangerang / Bekasi',480,'8 jam','Shift Harian 8 Jam',313,100000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Pertamanan','Tukang Kebun','tukang-kebun-baseline-2026',1,110000,'day','Per Hari','Memotong rumput, menyiram tanaman, membersihkan daun, dan merawat taman.','Jabodetabek',480,'8 jam','Harian / Mingguan',344,110000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Pertamanan','Buruh Tebang Rumput','buruh-tebang-rumput',1,120000,'day','Per Hari','Membersihkan rumput liar dan semak menggunakan alat manual atau mesin.','Jabodetabek',480,'8 jam','Panggilan 1 Hari',375,120000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Helper Tukang Cat','helper-tukang-cat',1,130000,'day','Per Hari','Menyiapkan permukaan, membawa material, membersihkan area, dan membantu pengecatan.','Jabodetabek',480,'8 jam','Harian / Proyek 1-4 Minggu',407,130000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Helper Tukang Keramik','helper-tukang-keramik',1,140000,'day','Per Hari','Membantu menyiapkan material, mengaduk adonan, dan membersihkan area pekerjaan.','Jabodetabek',480,'8 jam','Harian / Proyek 1-4 Minggu',438,140000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi / Fabrikasi','Helper Tukang Las','helper-tukang-las',2,140000,'day','Per Hari','Membantu menyiapkan material, memegang benda kerja, dan membersihkan area.','Jakarta / Bekasi / Tangerang',480,'8 jam','Harian / Proyek',438,140000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Buruh Gali Tanah','buruh-gali-tanah',1,150000,'day','Per Hari','Menggali tanah untuk pondasi, saluran, taman, atau pekerjaan utilitas.','Jabodetabek',480,'8 jam','Panggilan / Proyek 1-4 Minggu',469,150000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Helper Tukang Plafon','helper-tukang-plafon',1,140000,'day','Per Hari','Membantu membawa material, memotong material sederhana, dan membersihkan area.','Jabodetabek',480,'8 jam','Harian / Proyek',438,140000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Buruh Cor Beton','buruh-cor-beton',2,160000,'day','Per Hari','Membantu pengadukan, pemindahan, dan pekerjaan pengecoran beton.','Jabodetabek',480,'8 jam','Panggilan / Proyek',500,160000,'KerjaHarian baseline 2026',true,now()),
('renovasi','Konstruksi','Helper Renovasi Rumah','helper-renovasi-rumah',1,140000,'day','Per Hari','Membantu berbagai pekerjaan fisik ringan selama proses renovasi.','Jabodetabek',480,'8 jam','Harian / Proyek 1-8 Minggu',438,140000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Event','Crew Event / Bongkar Pasang','crew-event-bongkar-pasang',1,150000,'day','Per Hari','Membantu membawa perlengkapan, memasang peralatan, dan membongkar venue.','Jakarta / Tangerang / Bekasi',480,'8 jam','Event 1-3 Hari',469,150000,'KerjaHarian baseline 2026',true,now()),
('kebersihan','F&B','Helper Catering','helper-catering',1,100000,'day','Per Hari','Membantu persiapan makanan, packing, loading, dan distribusi catering.','Jakarta / Tangerang / Bekasi',480,'8 jam','Panggilan / Event',313,100000,'KerjaHarian baseline 2026',true,now()),
('kebersihan','F&B','Crew Dapur Harian','crew-dapur-harian',1,100000,'day','Per Hari','Membantu persiapan bahan, kebersihan dapur, dan pekerjaan dapur sederhana.','Jabodetabek',480,'8 jam','Shift 8-10 Jam',313,100000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Jasa Otomotif','Crew Cuci Motor','crew-cuci-motor',1,90000,'day','Per Hari','Mencuci, membersihkan, mengeringkan, dan merapikan kendaraan pelanggan.','Jabodetabek',480,'8 jam','Shift Harian',282,90000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Otomotif','Helper Bengkel Motor','helper-bengkel-motor',1,120000,'day','Per Hari','Membantu mekanik, mengambil alat, membersihkan komponen, dan area kerja.','Jabodetabek',480,'8 jam','Harian / Panggilan',375,120000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Furnitur','Helper Furniture','helper-furniture',1,120000,'day','Per Hari','Membantu produksi, membawa material, pengamplasan sederhana, dan membersihkan area.','Jakarta / Bekasi / Tangerang',480,'8 jam','Harian / Proyek',375,120000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Daur Ulang','Buruh Sortir Barang Bekas','buruh-sortir-barang-bekas',1,100000,'day','Per Hari','Memilah kardus, plastik, logam, dan material berdasarkan jenisnya.','Jakarta / Bekasi',480,'8 jam','Harian Lepas',313,100000,'KerjaHarian baseline 2026',true,now()),
('serabutan','Ritel','Helper Toko Kelontong','helper-toko-kelontong',1,100000,'day','Per Hari','Mengangkat stok, menata rak, menerima barang, dan membantu kebersihan toko.','Jabodetabek',480,'8 jam','Harian / Shift',313,100000,'KerjaHarian baseline 2026',true,now()),
('logistik','Logistik & Pasar','Crew Pasar / Bongkar Dagangan','crew-pasar-bongkar-dagangan',1,120000,'day','Per Hari','Membantu pedagang membawa, menata, dan membongkar barang dagangan.','Jakarta / Bekasi / Tangerang',480,'8 jam','Panggilan Harian',375,120000,'KerjaHarian baseline 2026',true,now()),
('kebersihan','Kebersihan','Tenaga Angkut Sampah / Kebersihan Area','tenaga-angkut-sampah-kebersihan',1,120000,'day','Per Hari','Mengumpulkan, mengangkut, dan memindahkan sampah dari area kerja ke titik pembuangan.','Jabodetabek',480,'8 jam','Harian / Panggilan',375,120000,'KerjaHarian baseline 2026',true,now())
ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id,category_label=EXCLUDED.category_label,job_name=EXCLUDED.job_name,tier=EXCLUDED.tier,base_price=EXCLUDED.base_price,unit=EXCLUDED.unit,pay_unit=EXCLUDED.pay_unit,description=EXCLUDED.description,location_scope=EXCLUDED.location_scope,duration_minutes=EXCLUDED.duration_minutes,duration_label=EXCLUDED.duration_label,contract_duration=EXCLUDED.contract_duration,overtime_rate_per_minute=EXCLUDED.overtime_rate_per_minute,minimum_price=EXCLUDED.minimum_price,source_system=EXCLUDED.source_system,is_active=EXCLUDED.is_active,last_researched_at=EXCLUDED.last_researched_at;
