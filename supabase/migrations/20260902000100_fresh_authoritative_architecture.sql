-- RxScan Nigeria: fresh authoritative architecture
-- Intended for a fresh database. Existing production data is not deleted by this migration.
create extension if not exists pgcrypto;

create table if not exists public.drug_sources (
  id uuid primary key default gen_random_uuid(), source_name text not null,
  source_type text not null check (source_type in ('rxnorm','neml','pubmed','curated')),
  source_version text, source_url text, retrieved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb, unique (source_name, source_version)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(), name text not null,
  normalized_name text generated always as (lower(trim(name))) stored, rxcui text,
  drug_class text, mechanism_of_action text, side_effects text[] default '{}',
  contraindications text[] default '{}', administration jsonb default '{}'::jsonb,
  food_interactions jsonb default '[]'::jsonb, source_id uuid references public.drug_sources(id) on delete set null,
  source_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists ingredients_rxcui_uq on public.ingredients(rxcui) where rxcui is not null;
create index if not exists ingredients_name_idx on public.ingredients(normalized_name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null,
  normalized_name text generated always as (lower(trim(name))) stored, rxcui text, tty text,
  dose_form text, strength text, brand_name text, source_id uuid references public.drug_sources(id) on delete set null,
  source_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists products_rxcui_uq on public.products(rxcui) where rxcui is not null;
create index if not exists products_name_idx on public.products(normalized_name);

create table if not exists public.product_ingredients (
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  strength text, strength_value numeric, strength_unit text,
  primary key (product_id, ingredient_id)
);

create table if not exists public.drug_aliases (
  id uuid primary key default gen_random_uuid(), alias text not null,
  normalized_alias text generated always as (lower(trim(alias))) stored, language text not null default 'en',
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  source_id uuid references public.drug_sources(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists drug_aliases_norm_idx on public.drug_aliases(normalized_alias);

create table if not exists public.neml_memberships (
  id uuid primary key default gen_random_uuid(), ingredient_id uuid references public.ingredients(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade, medicine_name text not null,
  section text, dosage_form text, strength text, category text, edition text not null,
  source_id uuid references public.drug_sources(id) on delete set null, evidence text, created_at timestamptz not null default now()
);
create index if not exists neml_name_idx on public.neml_memberships(lower(medicine_name));
create index if not exists neml_ingredient_idx on public.neml_memberships(ingredient_id);
create unique index if not exists neml_row_uq on public.neml_memberships(lower(medicine_name), edition, coalesce(dosage_form,''), coalesce(strength,''));

create table if not exists public.drug_interactions (
  id uuid primary key default gen_random_uuid(), ingredient_a_id uuid not null references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references public.ingredients(id) on delete cascade, severity text, description text,
  management text, source_id uuid references public.drug_sources(id) on delete set null, source_reference text, created_at timestamptz not null default now(),
  check (ingredient_a_id <> ingredient_b_id)
);
create unique index if not exists drug_interactions_pair_uq on public.drug_interactions(least(ingredient_a_id, ingredient_b_id), greatest(ingredient_a_id, ingredient_b_id));

create table if not exists public.interaction_evidence (
  id uuid primary key default gen_random_uuid(), interaction_id uuid references public.drug_interactions(id) on delete cascade,
  ingredient_a_id uuid references public.ingredients(id) on delete cascade, ingredient_b_id uuid references public.ingredients(id) on delete cascade,
  pmid text, title text, journal text, publication_year integer, evidence_summary text, source_url text,
  source_id uuid references public.drug_sources(id) on delete set null, retrieved_at timestamptz not null default now(),
  unique (pmid, ingredient_a_id, ingredient_b_id)
);
create index if not exists interaction_evidence_pair_idx on public.interaction_evidence(ingredient_a_id, ingredient_b_id);
create index if not exists interaction_evidence_pmid_idx on public.interaction_evidence(pmid);

create table if not exists public.prescription_scans (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  image_url text, raw_ocr_text text, extracted_medications jsonb not null default '[]'::jsonb,
  resolved_products jsonb not null default '[]'::jsonb, neml_results jsonb not null default '[]'::jsonb,
  interaction_warnings jsonb not null default '[]'::jsonb, evidence jsonb not null default '[]'::jsonb,
  verified_by text, created_at timestamptz not null default now()
);
create index if not exists prescription_scans_user_idx on public.prescription_scans(user_id, created_at desc);

insert into public.drug_sources(source_name, source_type, source_version, source_url)
values
 ('NLM RxNorm','rxnorm','current','https://www.nlm.nih.gov/research/umls/rxnorm/'),
 ('Nigeria Essential Medicines List','neml','8th Edition 2024','https://www.health.gov.ng/wp-content/uploads/2025/08/Final-NEML-Adult-8th-Edition.pdf'),
 ('NCBI PubMed','pubmed','E-utilities','https://www.ncbi.nlm.nih.gov/books/NBK25497/')
on conflict (source_name, source_version) do nothing;

alter table public.drug_sources enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.drug_aliases enable row level security;
alter table public.neml_memberships enable row level security;
alter table public.drug_interactions enable row level security;
alter table public.interaction_evidence enable row level security;
alter table public.prescription_scans enable row level security;

do $$ begin create policy "public read drug sources" on public.drug_sources for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read ingredients" on public.ingredients for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read products" on public.products for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read product ingredients" on public.product_ingredients for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read aliases" on public.drug_aliases for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read neml" on public.neml_memberships for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read interactions" on public.drug_interactions for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read interaction evidence" on public.interaction_evidence for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "users read own scans" on public.prescription_scans for select using (auth.uid() = user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "users insert own scans" on public.prescription_scans for insert with check (auth.uid() = user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "users delete own scans" on public.prescription_scans for delete using (auth.uid() = user_id); exception when duplicate_object then null; end $$;

create or replace function public.get_neml_membership(p_ingredient_id uuid)
returns setof public.neml_memberships language sql stable security definer set search_path = public
as $$ select * from public.neml_memberships where ingredient_id = p_ingredient_id order by edition desc $$;

create or replace function public.get_interaction_evidence(p_a uuid, p_b uuid)
returns setof public.interaction_evidence language sql stable security definer set search_path = public
as $$ select e.* from public.interaction_evidence e where (e.ingredient_a_id = p_a and e.ingredient_b_id = p_b) or (e.ingredient_a_id = p_b and e.ingredient_b_id = p_a) order by e.publication_year desc nulls last $$;
