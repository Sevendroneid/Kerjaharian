-- Storage Policies untuk KYC Documents
-- Bucket kyc-docs PRIVATE untuk menyimpan foto KTP
-- User hanya bisa akses foto KTP miliknya sendiri (folder = user_id)

INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-docs', 'kyc-docs', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_own_kyc" ON storage.objects;
CREATE POLICY "read_own_kyc"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "insert_own_kyc" ON storage.objects;
CREATE POLICY "insert_own_kyc"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_kyc" ON storage.objects;
CREATE POLICY "update_own_kyc"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_kyc" ON storage.objects;
CREATE POLICY "delete_own_kyc"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
