-- Run this in your Supabase SQL editor

alter table public.meal_plan
  add column if not exists color text not null default 'green'
  check (color in ('green', 'orange', 'blue'));
