-- KerjaHarian KYC hardening: uploading a KTP is a submission, never an automatic verification.
-- Both workers and employers use the same identity-verification gate.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_kyc_status_check' AND conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_kyc_status_check CHECK (kyc_status IN ('not_started','pending','approved','rejected'));
  END IF;
END $$;

UPDATE public.profiles SET kyc_status = CASE WHEN kyc_verified THEN 'approved' ELSE 'not_started' END WHERE kyc_status = 'not_started';

CREATE OR REPLACE FUNCTION public.verify_kyc()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ktp_photo_url IS NOT NULL) THEN
    RAISE EXCEPTION 'Upload foto KTP terlebih dahulu';
  END IF;
  UPDATE public.profiles SET kyc_verified=false, kyc_status='pending', kyc_submitted_at=now(), kyc_reviewed_at=NULL, kyc_reviewed_by=NULL, kyc_rejection_reason=NULL WHERE id=auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.verify_kyc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_kyc() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(p_user_id uuid, p_approve boolean, p_rejection_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true) THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND ktp_photo_url IS NOT NULL) THEN RAISE EXCEPTION 'Pengguna belum mengirim dokumen KTP'; END IF;
  UPDATE public.profiles SET kyc_verified=p_approve, kyc_status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, kyc_reviewed_at=now(), kyc_reviewed_by=auth.uid(), kyc_rejection_reason=CASE WHEN p_approve THEN NULL ELSE NULLIF(trim(p_rejection_reason),'') END, is_online=CASE WHEN p_approve THEN is_online ELSE false END WHERE id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;

DROP POLICY IF EXISTS "insert_own_jobs" ON public.jobs;
CREATE POLICY "insert_own_jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (
  auth.uid()=employer_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='employer' AND kyc_verified=true)
);

CREATE OR REPLACE FUNCTION public.update_worker_status(p_is_online boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker') THEN RAISE EXCEPTION 'Hanya akun mitra pekerja yang dapat mengubah status online'; END IF;
  IF p_is_online AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND kyc_verified=true) THEN RAISE EXCEPTION 'Verifikasi identitas KTP diperlukan sebelum online'; END IF;
  UPDATE public.profiles SET is_online=p_is_online WHERE id=auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.update_worker_status(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_worker_status(boolean) TO authenticated;

DROP POLICY IF EXISTS "read_own_kyc" ON storage.objects;
CREATE POLICY "read_own_kyc" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='kyc-docs' AND (auth.uid()::text=(storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin=true))
);

CREATE OR REPLACE FUNCTION public.admin_list_kyc()
RETURNS TABLE (user_id uuid, full_name text, phone text, role text, kyc_status text, ktp_photo_url text, kyc_submitted_at timestamptz, kyc_reviewed_at timestamptz, kyc_rejection_reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true) THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
  RETURN QUERY SELECT p.id,p.full_name,p.phone,p.role,p.kyc_status,p.ktp_photo_url,p.kyc_submitted_at,p.kyc_reviewed_at,p.kyc_rejection_reason FROM public.profiles p WHERE p.kyc_status IN ('pending','rejected') ORDER BY p.kyc_submitted_at DESC NULLS LAST;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_kyc() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc() TO authenticated;

COMMENT ON COLUMN public.profiles.kyc_status IS 'KYC state: not_started, pending, approved, rejected. Upload never implies approval.';
COMMENT ON COLUMN public.profiles.kyc_verified IS 'Server-controlled approval flag; only admin_review_kyc may set it true.';
