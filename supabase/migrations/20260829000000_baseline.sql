-- RxScan Nigeria baseline migration
-- Mirrors the original schema so a fresh Supabase project can be built entirely
-- from migration files. All statements are idempotent.

create extension if not exists pgcrypto;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rxcui text,
  drug_class text,
  administration jsonb,
  food_interactions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.drug_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  manufacturer text,
  dosage_form text,
  strength text,
  route text,
  nafdac_number text,
  available_in_nigeria boolean not null default true,
  nhis_covered boolean not null default false,
  prescription_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_ingredient_map (
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  primary key (product_id, ingredient_id)
);

create table if not exists public.drug_interactions (
  id uuid primary key default gen_random_uuid(),
  ingredient_a_id uuid not null references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references public.ingredients(id) on delete cascade,
  severity text not null check (severity in ('severe','moderate','mild','info','contraindicated')),
  description text not null,
  mechanism text,
  clinical_effect text,
  onset text,
  alternatives text,
  management text,
  created_at timestamptz not null default now(),
  unique (ingredient_a_id, ingredient_b_id)
);

create table if not exists public.prescription_scans (
  id uuid primary key default gen_random_uuid(),
  raw_ocr_text text not null default '',
  extracted_medications jsonb not null default '[]'::jsonb,
  resolved_products jsonb not null default '[]'::jsonb,
  interaction_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists drug_aliases_alias_idx on public.drug_aliases using gin (to_tsvector('simple', alias));
create index if not exists ingredients_name_idx on public.ingredients using gin (to_tsvector('simple', name));
create index if not exists scans_created_at_idx on public.prescription_scans (created_at desc);
