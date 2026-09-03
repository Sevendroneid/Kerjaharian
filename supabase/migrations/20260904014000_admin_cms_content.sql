-- Admin CMS content: persistent editable copy for site-wide UI text.
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL UNIQUE,
  section text NOT NULL DEFAULT 'general',
  value_id text NOT NULL DEFAULT '',
  value_en text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
CREATE POLICY "Public can read site content"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
CREATE POLICY "Admins can insert site content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Admins can delete site content" ON public.site_content;
CREATE POLICY "Admins can delete site content"
  ON public.site_content FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS site_content_section_idx ON public.site_content(section);

INSERT INTO public.site_content (content_key, section, value_id, value_en, description) VALUES
('site.badge','header','KerjaHarian','KerjaHarian','Badge beside the logo'),
('nav.home','header','Beranda','Home','Main navigation label'),
('nav.employer','header','Pesan Tenaga Kerja','Hire Workers','Employer navigation label'),
('nav.worker','header','Mitra Pekerja','Worker Network','Worker navigation label'),
('nav.cs','header','CS WA','CS Chat','Customer service button'),
('footer.description','footer','Platform on-demand kilat yang menghubungkan pemberi kerja dengan tenaga kerja harian terampil terdekat di seluruh Indonesia.','On-demand platform connecting employers with skilled daily workers nearby across Indonesia.','Footer company description'),
('footer.services','footer','Layanan','Services','Footer services heading'),
('footer.legal','footer','Perusahaan & Legal','Company & Legal','Footer legal heading'),
('footer.contact','footer','Kontak Resmi CS','Official CS Contact','Footer contact heading'),
('footer.copyright','footer','© 2026 PT Kerja Harian Indonesia. Semua hak dilindungi.','© 2026 PT Kerja Harian Indonesia. All rights reserved.','Footer copyright'),
('footer.tagline','footer','Solusi Cepat Tenaga Kerja Terampil Terdekat','Fast Access to Skilled Workers Nearby','Footer tagline'),
('contact.whatsapp','contact','6288289767019','6288289767019','WhatsApp number without + or spaces')
ON CONFLICT (content_key) DO NOTHING;
