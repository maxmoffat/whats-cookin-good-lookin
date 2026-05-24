-- Run this in your Supabase SQL editor

-- Allow recipe_id to be null (for manually-named entries)
alter table public.meal_plan
  alter column recipe_id drop not null;

-- Store the custom name for manually-added entries
alter table public.meal_plan
  add column if not exists custom_recipe_name text;

-- Ensure every row has at least one of the two
alter table public.meal_plan
  add constraint meal_plan_recipe_check
  check (recipe_id is not null or custom_recipe_name is not null);
