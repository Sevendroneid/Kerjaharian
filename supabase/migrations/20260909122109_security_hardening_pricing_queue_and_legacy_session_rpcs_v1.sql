begin;

alter table public.pricing_recalc_queue enable row level security;
alter table public.pricing_worker_runs enable row level security;

create index if not exists idx_pricing_recalc_queue_job_id on public.pricing_recalc_queue(job_id);
create index if not exists idx_pricing_recalc_queue_pending_created_at on public.pricing_recalc_queue(status, created_at) where status = 'pending';
create index if not exists idx_pricing_worker_runs_started_at on public.pricing_worker_runs(started_at desc);

revoke execute on function public.queue_pricing_recalc_for_job() from public, anon, authenticated;
revoke execute on function public.queue_pricing_recalc_for_order() from public, anon, authenticated;
revoke execute on function public.clear_public_job_phone() from public, anon, authenticated;
revoke execute on function public.fn_audit_trigger() from public, anon, authenticated;
revoke execute on function public.prevent_profile_role_escalation() from public, anon, authenticated;
revoke execute on function public.protect_kyc_fields() from public, anon, authenticated;
revoke execute on function public.protect_participant_order_mutation() from public, anon, authenticated;
revoke execute on function public.protect_profile_server_fields() from public, anon, authenticated;
revoke execute on function public.sync_order_to_job() from public, anon, authenticated;
revoke execute on function public.validate_wage_before_insert() from public, anon, authenticated;

create or replace function public.request_extend_session(p_transaction_id uuid, p_approver text)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog', 'public' as $$
declare txn_record record; pricing_record record; new_extension_count smallint; additional_fee numeric;
begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  select * into txn_record from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if auth.uid() <> txn_record.employer_id and auth.uid() <> txn_record.worker_id then raise exception 'Anda bukan partisipan transaksi ini'; end if;
  if txn_record.session_status <> 'active' then raise exception 'Hanya sesi aktif yang bisa di-extend!'; end if;
  select * into pricing_record from public.job_pricing where job_category_id = txn_record.job_category_id and sub_job_title = txn_record.sub_job_title;
  if not found then raise exception 'Data pricing tidak ditemukan!'; end if;
  new_extension_count := coalesce(txn_record.extension_count,0) + 1;
  if (4 + new_extension_count) > pricing_record.max_hours_limit then raise exception 'Maksimal durasi kerja tercapai (% jam). Tidak bisa extend lagi.', pricing_record.max_hours_limit; end if;
  additional_fee := pricing_record.extend_price_per_h;
  update public.transactions set extension_count=new_extension_count, base_wage=base_wage+additional_fee, total_amount=total_amount+additional_fee, end_time=null, updated_at=now() where id=p_transaction_id;
  return jsonb_build_object('status','success','message',format('Sesi diperpanjang 1 jam (+Rp %s)',additional_fee),'new_extension_count',new_extension_count,'additional_fee',additional_fee,'new_total_amount',txn_record.total_amount+additional_fee,'alert_type','SESSION_EXTENDED','next_alert_at',now()+interval '59 minutes');
end; $$;

create or replace function public.start_work_session(p_transaction_id uuid, p_worker_lat numeric, p_worker_lng numeric, p_job_lat numeric, p_job_lng numeric)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog', 'public' as $$
declare dist_km numeric; txn_record record;
begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  select * into txn_record from public.transactions where id=p_transaction_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan!'; end if;
  if txn_record.worker_id is distinct from auth.uid() then raise exception 'Hanya pekerja yang ditugaskan yang dapat memulai sesi'; end if;
  if txn_record.session_status <> 'pending' then raise exception 'Sesi sudah dalam status: %',txn_record.session_status; end if;
  if p_worker_lat is null or p_worker_lng is null or p_job_lat is null or p_job_lng is null or p_worker_lat not between -90 and 90 or p_job_lat not between -90 and 90 or p_worker_lng not between -180 and 180 or p_job_lng not between -180 and 180 then raise exception 'Koordinat GPS tidak valid'; end if;
  dist_km := 6371 * acos(least(1,greatest(-1,cos(radians(p_job_lat))*cos(radians(p_worker_lat))*cos(radians(p_worker_lng)-radians(p_job_lng))+sin(radians(p_job_lat))*sin(radians(p_worker_lat)))));
  if dist_km > 0.05 then raise exception 'Worker terlalu jauh dari lokasi job (%.2f km). Minimal harus dalam radius 50m.',dist_km; end if;
  update public.transactions set session_status='active',start_time=now(),updated_at=now() where id=p_transaction_id;
  return jsonb_build_object('status','success','message','Sesi dimulai! Notifikasi terkirim ke Employer.','start_time',now(),'estimated_end',now()+interval '4 hours'+(coalesce(txn_record.extension_count,0)||' hours')::interval,'alert_type','SESSION_STARTED');
end; $$;

revoke execute on function public.request_extend_session(uuid,text) from anon;
revoke execute on function public.start_work_session(uuid,numeric,numeric,numeric,numeric) from anon;
grant execute on function public.request_extend_session(uuid,text) to authenticated;
grant execute on function public.start_work_session(uuid,numeric,numeric,numeric,numeric) to authenticated;

commit;
