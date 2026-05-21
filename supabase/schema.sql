-- What's Cookin', Good Lookin'? — Supabase Schema
-- Run this in your Supabase SQL editor at supabase.com

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

create table if not exists recipes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  prep_time   integer,       -- minutes
  cook_time   integer,       -- minutes
  servings    integer,
  instructions text,
  image_url   text,
  source_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists ingredients (
  id         uuid primary key default uuid_generate_v4(),
  recipe_id  uuid not null references recipes(id) on delete cascade,
  name       text not null,
  quantity   text,          -- kept as text: "1/2", "a handful", etc.
  unit       text,
  sort_order integer not null default 0
);

create table if not exists tags (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

create table if not exists recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

create index if not exists recipes_user_id_idx on recipes(user_id);
create index if not exists recipes_created_at_idx on recipes(created_at desc);
create index if not exists ingredients_recipe_id_idx on ingredients(recipe_id);
create index if not exists recipe_tags_recipe_id_idx on recipe_tags(recipe_id);
create index if not exists recipe_tags_tag_id_idx on recipe_tags(tag_id);

-- Full-text search on recipe name + description
create index if not exists recipes_fts_idx on recipes using gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- ─────────────────────────────────────────────
-- Auto-update updated_at
-- ─────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger recipes_updated_at
  before update on recipes
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table recipes     enable row level security;
alter table ingredients enable row level security;
alter table tags        enable row level security;
alter table recipe_tags enable row level security;

-- Recipes: users can only see/edit their own
create policy "users manage their own recipes"
  on recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ingredients: access via recipe ownership
create policy "users manage their own ingredients"
  on ingredients for all
  using (
    recipe_id in (select id from recipes where user_id = auth.uid())
  )
  with check (
    recipe_id in (select id from recipes where user_id = auth.uid())
  );

-- Tags: users can only see/edit their own
create policy "users manage their own tags"
  on tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recipe tags: access via recipe ownership
create policy "users manage their own recipe_tags"
  on recipe_tags for all
  using (
    recipe_id in (select id from recipes where user_id = auth.uid())
  )
  with check (
    recipe_id in (select id from recipes where user_id = auth.uid())
  );
