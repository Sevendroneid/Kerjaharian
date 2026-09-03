-- KerjaHarian: Midtrans Snap payment bridge.
-- Server-authoritative amount comes from jobs.final_amount/employer_total.
-- Secrets are never stored in the database.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS midtrans_order_id text,
  ADD COLUMN IF NOT EXISTS midtrans_transaction_status text,
  ADD COLUMN IF NOT EXISTS midtrans_snap_token text,
  ADD COLUMN IF NOT EXISTS midtrans_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_midtrans_order_id
  ON public.jobs(midtrans_order_id)
  WHERE midtrans_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_midtrans_transaction_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_midtrans_transaction_status_check CHECK (
    midtrans_transaction_status IS NULL OR midtrans_transaction_status IN
      ('pending','capture','settlement','deny','cancel','expire','failure','refund','partial_refund','authorize')
  );

-- Payment state can only be finalized by trusted server-side webhook/API code.
-- Keep the existing RLS model; these columns are not writable by clients through
-- the payment endpoint because the endpoint uses the service role only after auth.
COMMENT ON COLUMN public.jobs.midtrans_order_id IS 'Stable Midtrans transaction order ID for this completed job.';
COMMENT ON COLUMN public.jobs.midtrans_snap_token IS 'Midtrans Snap token; never expose Server Key.';
COMMENT ON COLUMN public.jobs.paid_at IS 'Timestamp received for a successful Midtrans settlement/capture.';
