-- Run this in your Supabase SQL editor

create table if not exists public.meal_plan (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  recipe_id   uuid        not null references public.recipes(id) on delete cascade,
  date        date        not null,
  meal_time   text        not null check (meal_time in ('breakfast', 'lunch', 'dinner')),
  created_at  timestamptz not null default now()
);

alter table public.meal_plan enable row level security;

create policy "Users can manage their own meal plan entries"
  on public.meal_plan for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists meal_plan_user_date_idx
  on public.meal_plan (user_id, date);
