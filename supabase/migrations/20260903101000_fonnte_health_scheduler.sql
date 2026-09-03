create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('kerjaharian-fonnte-health','*/5 * * * *', $$
  select net.http_post(
    url := 'https://cgulvtbyqkixpxxqzcet.supabase.co/functions/v1/fonnte-health-check',
    headers := jsonb_build_object('Content-Type','application/json','X-Health-Key',(select health_secret from public.fonnte_monitor_config where id=true)),
    body := jsonb_build_object('source','pg_cron')
  ) as request_id;
$$);
