drop policy if exists resolution_participants_insert on public.resolutions;

create policy resolution_participants_insert
on public.resolutions
for insert
to authenticated
with check (
  opened_by = auth.uid()
  and job_id is null
  and ((employer_id = auth.uid()) or (worker_id = auth.uid()))
  and exists (
    select 1
    from public.orders o
    where o.id = public.resolutions.order_id
      and o.employer_id = public.resolutions.employer_id
      and (o.worker_id = public.resolutions.worker_id
        or (public.resolutions.worker_id is null and o.worker_id is null))
      and (o.employer_id = auth.uid() or o.worker_id = auth.uid())
  )
);

alter table public.resolutions drop constraint if exists resolutions_description_length_chk;
alter table public.resolutions drop constraint if exists resolutions_disputed_amount_nonnegative_chk;
