-- v2 (applied 2026-10-24; PINs replaced by placeholders): flexible logging, username+PIN accounts, machine photos, Hasan's 3-day program
alter table public.profiles add column if not exists username text unique;
alter table public.programs add column if not exists archived boolean not null default false;
alter table public.exercises add column if not exists video_url text;
alter table public.exercises add column if not exists archived boolean not null default false;
alter table public.workout_logs add column if not exists status text not null default 'done' check (status in ('active','done'));
alter table public.workout_logs add column if not exists started_at timestamptz;
alter table public.workout_logs add column if not exists finished_at timestamptz;
alter table public.workout_logs add column if not exists plan jsonb not null default '[]'::jsonb;
alter table public.workout_logs add column if not exists sets jsonb not null default '[]'::jsonb;
alter table public.workout_logs add column if not exists updated_at timestamptz not null default now();

-- one call saves a whole session (header + plan + every set): the client autosaves and works offline
create or replace function public.save_workout(p jsonb) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := now();
begin
  insert into public.workout_logs as w (id, trainee_id, day_id, day_name, performed_on, status, started_at, finished_at, rpe, notes, plan, sets, updated_at)
  values ((p->>'id')::uuid, auth.uid(), nullif(p->>'day_id','')::uuid, p->>'day_name',
          coalesce(nullif(p->>'performed_on','')::date, current_date), coalesce(p->>'status','active'),
          nullif(p->>'started_at','')::timestamptz, nullif(p->>'finished_at','')::timestamptz,
          nullif(p->>'rpe','')::int, nullif(p->>'notes',''), coalesce(p->'plan','[]'::jsonb), coalesce(p->'sets','[]'::jsonb), v_now)
  on conflict (id) do update set
    day_id = excluded.day_id, day_name = excluded.day_name, performed_on = excluded.performed_on,
    status = excluded.status, started_at = excluded.started_at, finished_at = excluded.finished_at,
    rpe = excluded.rpe, notes = excluded.notes, plan = excluded.plan, sets = excluded.sets, updated_at = v_now
  where w.trainee_id = auth.uid();
  if not found then raise exception 'not allowed'; end if;
  return v_now;
end;
$$;
revoke all on function public.save_workout(jsonb) from public, anon;
grant execute on function public.save_workout(jsonb) to authenticated;

-- daily ping from GitHub Actions keeps the free project from pausing
create or replace function public.keepalive() returns int language sql stable set search_path = '' as $$ select 1 $$;
grant execute on function public.keepalive() to anon, authenticated;

-- machine photos: each trainee writes their own folder, coach reads everything
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('machine-photos', 'machine-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
create policy "own machine photos read" on storage.objects for select to authenticated
  using (bucket_id = 'machine-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_coach())));
create policy "own machine photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'machine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.is_member()));
create policy "own machine photos update" on storage.objects for update to authenticated
  using (bucket_id = 'machine-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- accounts: username + PIN (internal email user@users.hsnoals.com)
insert into private.allowed_signups values ('hasan@users.hsnoals.com'), ('wassim@users.hsnoals.com') on conflict do nothing;

-- only Hasan's program is visible: older programs and the sample exercises are archived (kept, hidden)
update public.programs set archived = true;
update public.exercises set archived = true where name ~ '[ء-ي]';

with p as (
  insert into public.programs (name, description) values
  ('برنامج حسن — 3 أيام', '3 حصص بالأسبوع. كل جولة فعّالة لحد الفشل العضلي. خلّي يوم راحة بين الحصة والتانية.')
  returning id),
d as (
  insert into public.program_days (program_id, day_order, name)
  select p.id, x.o, x.n from p, (values (1, 'اليوم الأول'), (2, 'اليوم التاني'), (3, 'اليوم التالت')) x(o, n)
  returning id, day_order),
plan(day, pos, ex, sets) as (values
  (1,1,'Flat chest press machine',2),(1,2,'T-Bar row for upper back',2),(1,3,'Leg Press',2),(1,4,'Wide grip Lat pull down',1),
  (1,5,'Lateral raises machine',2),(1,6,'Leg Curls',1),(1,7,'Supported curl',1),(1,8,'Calf raises',1),(1,9,'Crunches',1),
  (2,1,'Incline chest press machine',2),(2,2,'Lat row',2),(2,3,'Leg Extensions',2),(2,4,'Kelso shrugs',2),
  (2,5,'Tri ext',1),(2,6,'Adductors',1),(2,7,'Spine ext',1),(2,8,'Wrist curl',1),(2,9,'Calf raises',1),
  (3,1,'Flat chest press machine',1),(3,2,'T-Bar row for upper back',1),(3,3,'Wide grip Lat pull down',2),(3,4,'Incline chest press machine',1),
  (3,5,'Leg Press',1),(3,6,'Leg Curls',2),(3,7,'Supported curl',2),(3,8,'Tri ext',2),(3,9,'Crunches',1))
insert into public.program_exercises (day_id, exercise_id, position, sets, reps, rest_seconds)
select d.id, e.id, plan.pos, plan.sets, 'للفشل', 120
from plan join d on d.day_order = plan.day join public.exercises e on e.name = plan.ex and not e.archived;

-- Hasan: username hasan, PIN-style password; profile gets the username and the program
update auth.users set email = 'hasan@users.hsnoals.com', encrypted_password = extensions.crypt('hsn:__COACH_PIN__:train', extensions.gen_salt('bf'))
  where email = 'hasanoyouna@gmail.com';
update auth.identities set identity_data = identity_data || '{"email":"hasan@users.hsnoals.com"}'
  where provider = 'email' and identity_data->>'email' = 'hasanoyouna@gmail.com';
update public.profiles set username = 'hasan', email = 'hasan@users.hsnoals.com', full_name = 'حسن عيون السود',
  program_id = (select id from public.programs where not archived limit 1) where role = 'coach';

-- Wassim Kabbani: username wassim
with u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'wassim@users.hsnoals.com',
    extensions.crypt('hsn:__WASSIM_PIN__:train', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"وسيم قباني"}', now(), now(), '', '', '', '')
  returning id, email),
i as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now() from u)
insert into public.profiles (id, email, username, full_name, role, program_id)
select u.id, u.email, 'wassim', 'وسيم قباني', 'trainee', (select id from public.programs where not archived limit 1) from u;
