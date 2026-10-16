-- Run this migration if schema.sql was already applied in your Supabase project.
-- It preserves existing participants, wishes, and prize results.
alter table public.prize_results
  add column if not exists prize_label text not null default 'Phần quà';

-- Replace only the available prize-wheel options. Existing recorded results stay intact.
delete from public.prize_wheel_config;
insert into public.prize_wheel_config(label, amount_vnd, weight, active) values
  ('Nụ hôn lốc xoáy 💋', 0, 1, true),
  ('6.868 VNĐ', 6868, 1, true),
  ('2.205 VNĐ', 2205, 1, true),
  ('9.999 VNĐ', 9999, 1, true),
  ('8.386 VNĐ', 8386, 1, true);
