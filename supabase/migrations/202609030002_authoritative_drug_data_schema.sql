create extension if not exists pgcrypto;

alter table public.ingredients add column if not exists source_id uuid;
alter table public.ingredients add column if not exists source_updated_at timestamptz;

drop table if exists public.products cascade;
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rxcui text,
  tty text,
  source_id uuid,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_rxcui_key on public.products(rxcui) where rxcui is not null;

create table if not exists public.drug_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  source_version text not null,
  source_url text,
  retrieved_at timestamptz not null default now(),
  unique(source_name, source_version)
);

create table if not exists public.product_ingredients (
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  primary key(product_id, ingredient_id)
);

create table if not exists public.neml_memberships (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references public.ingredients(id) on delete set null,
  medicine_name text not null,
  edition text not null,
  dosage_form text,
  strength text,
  source_id uuid references public.drug_sources(id) on delete set null,
  evidence text,
  created_at timestamptz not null default now()
);
create unique index if not exists neml_memberships_unique_idx
  on public.neml_memberships(lower(medicine_name), edition, coalesce(dosage_form,''), coalesce(strength,''));

create table public.drug_interactions (
  id uuid primary key default gen_random_uuid(),
  ingredient_a_id uuid not null references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references public.ingredients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(ingredient_a_id, ingredient_b_id)
);
create index drug_interactions_a_idx on public.drug_interactions(ingredient_a_id);
create index drug_interactions_b_idx on public.drug_interactions(ingredient_b_id);

create table if not exists public.interaction_evidence (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid references public.drug_interactions(id) on delete cascade,
  ingredient_a_id uuid references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid references public.ingredients(id) on delete cascade,
  pmid text,
  title text,
  journal text,
  publication_year integer,
  source_id uuid references public.drug_sources(id) on delete set null,
  source_url text,
  retrieved_at timestamptz not null default now(),
  unique(pmid, ingredient_a_id, ingredient_b_id)
);
create index if not exists interaction_evidence_interaction_idx on public.interaction_evidence(interaction_id);
