-- Canonicalize admin authorization on profiles.role='admin'.
-- Keep is_admin synchronized for legacy consumers while all CMS policies
-- use the same role gate as the newer KYC/server-side authorization.
UPDATE public.profiles
SET is_admin = (role = 'admin')
WHERE is_admin IS DISTINCT FROM (role = 'admin');

DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
CREATE POLICY "Admins can insert site content"
  ON public.site_content FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content"
  ON public.site_content FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete site content" ON public.site_content;
CREATE POLICY "Admins can delete site content"
  ON public.site_content FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Keep the server-side KYC list gate on the same canonical role.
CREATE OR REPLACE FUNCTION public.admin_list_kyc()
RETURNS TABLE(
  id uuid, full_name text, role text, phone text, ktp_photo_url text,
  kyc_verified boolean, kyc_status text, kyc_submitted_at timestamptz,
  kyc_reviewed_at timestamptz, kyc_rejection_reason text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.role::text, p.phone::text, p.ktp_photo_url,
         COALESCE(p.kyc_verified,false), p.kyc_status, p.kyc_submitted_at,
         p.kyc_reviewed_at, p.kyc_rejection_reason
  FROM public.profiles p
  WHERE p.role IN ('worker','employer') AND p.ktp_photo_url IS NOT NULL
  ORDER BY CASE p.kyc_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
           p.kyc_submitted_at NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_kyc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc() TO authenticated;
