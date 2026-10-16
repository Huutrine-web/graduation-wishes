-- Fresh Supabase project: run this entire file in SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.participants(
 id uuid primary key default gen_random_uuid(), display_name text not null check(char_length(display_name) between 2 and 80),
 phone text not null check(char_length(phone) between 9 and 20), phone_normalized text not null unique,
 spin_token_hash text not null, created_at timestamptz not null default now()
);
create table if not exists public.wishes(
 id uuid primary key default gen_random_uuid(), participant_id uuid not null unique references public.participants(id) on delete cascade,
 message text not null check(char_length(message) between 3 and 1200), visual_theme text not null check(visual_theme in('tree','trophy','stars')),
 created_at timestamptz not null default now()
);
create table if not exists public.prize_wheel_config(
 id integer generated always as identity primary key, label text not null, amount_vnd integer not null check(amount_vnd>=0),
 weight integer not null default 1 check(weight>0), active boolean not null default true
);
create table if not exists public.prize_settings(
 id boolean primary key default true check(id), budget_cap_vnd bigint null check(budget_cap_vnd is null or budget_cap_vnd>=0),
 enabled boolean not null default false, updated_at timestamptz not null default now()
);
insert into public.prize_settings(id,budget_cap_vnd,enabled) values(true,null,false) on conflict(id) do nothing;
create table if not exists public.prize_results(
 id uuid primary key default gen_random_uuid(), participant_id uuid not null unique references public.participants(id) on delete cascade,
 amount_vnd integer not null check(amount_vnd>=0), prize_label text not null default 'Phần quà', status text not null default 'pending' check(status in('pending','paid','void')),
 created_at timestamptz not null default now(), paid_at timestamptz
);
create index if not exists wishes_created_at_idx on public.wishes(created_at desc);

alter table public.participants enable row level security;
alter table public.wishes enable row level security;
alter table public.prize_wheel_config enable row level security;
alter table public.prize_settings enable row level security;
alter table public.prize_results enable row level security;

-- Admin status must be assigned in trusted app_metadata, never user_metadata.
create or replace function public.is_graduation_admin() returns boolean language sql stable as $$
 select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false);
$$;
create policy "admin read participants" on public.participants for select to authenticated using(public.is_graduation_admin());
create policy "admin read wishes" on public.wishes for select to authenticated using(public.is_graduation_admin());
create policy "admin read prizes" on public.prize_results for select to authenticated using(public.is_graduation_admin());
create policy "admin update prizes" on public.prize_results for update to authenticated using(public.is_graduation_admin()) with check(public.is_graduation_admin());
create policy "admin read wheel config" on public.prize_wheel_config for select to authenticated using(public.is_graduation_admin());
create policy "admin manage wheel config" on public.prize_wheel_config for all to authenticated using(public.is_graduation_admin()) with check(public.is_graduation_admin());
create policy "admin manage prize settings" on public.prize_settings for all to authenticated using(public.is_graduation_admin()) with check(public.is_graduation_admin());

insert into public.prize_wheel_config(label,amount_vnd,weight,active)
select v.label,v.amount_vnd,v.weight,true from(values
 ('Nụ hôn lốc xoáy 💋',0,1),
 ('6.868 VNĐ',6868,1),
 ('2.205 VNĐ',2205,1),
 ('9.999 VNĐ',9999,1),
 ('8.386 VNĐ',8386,1)
) as v(label,amount_vnd,weight) where not exists(select 1 from public.prize_wheel_config);
-- Prize wheel stays disabled until the owner decides on a budget and enables it.
