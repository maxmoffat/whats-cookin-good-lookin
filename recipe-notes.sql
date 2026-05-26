create table if not exists public.recipe_notes (
  id         uuid        primary key default gen_random_uuid(),
  recipe_id  uuid        not null references public.recipes(id) on delete cascade,
  user_id    uuid        not null references auth.users(id)   on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

alter table public.recipe_notes enable row level security;

create policy "Users can manage their own recipe notes"
  on public.recipe_notes
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists recipe_notes_recipe_id_idx
  on public.recipe_notes (recipe_id, created_at desc);
