-- RxScan Nigeria: authoritative drug-data extensions
-- Sources: NLM RxNorm, NCBI PubMed, Nigeria Essential Medicines List / WHO repository.
-- This migration is intentionally additive and idempotent.

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  publisher text not null,
  source_url text not null,
  version text,
  retrieved_at timestamptz not null default now(),
  notes text
);

alter table public.ingredients
  add column if not exists source_system text,
  add column if not exists source_id text,
  add column if not exists source_version text,
  add column if not exists verified_at timestamptz;

alter table public.products
  add column if not exists source_system text,
  add column if not exists source_id text,
  add column if not exists source_version text,
  add column if not exists ndc_codes text[],
  add column if not exists verified_at timestamptz;

alter table public.drug_interactions
  add column if not exists source_system text,
  add column if not exists source_id text,
  add column if not exists source_version text,
  add column if not exists evidence_level text,
  add column if not exists verified_at timestamptz;

create table if not exists public.medicine_list_memberships (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  list_name text not null,
  country_code text,
  edition text,
  status text not null default 'listed',
  source_url text,
  retrieved_at timestamptz not null default now(),
  unique (ingredient_id, list_name, edition)
);

create table if not exists public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  source_name text not null,
  source_id text,
  source_url text,
  retrieved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(product_id, source_name, source_id)
);

create table if not exists public.interaction_evidence (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid references public.drug_interactions(id) on delete cascade,
  ingredient_a_id uuid references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid references public.ingredients(id) on delete cascade,
  pmid text not null,
  title text,
  journal text,
  publication_year integer,
  abstract text,
  pubmed_url text generated always as ('https://pubmed.ncbi.nlm.nih.gov/' || pmid || '/') stored,
  retrieved_at timestamptz not null default now(),
  unique(ingredient_a_id, ingredient_b_id, pmid)
);

create index if not exists idx_ingredients_rxcui on public.ingredients(rxcui);
create index if not exists idx_products_source_id on public.products(source_system, source_id);
create index if not exists idx_interactions_pair on public.drug_interactions(ingredient_a_id, ingredient_b_id);
create index if not exists idx_memberships_list on public.medicine_list_memberships(list_name, edition);
create index if not exists idx_evidence_pmid on public.interaction_evidence(pmid);

insert into public.data_sources(name,publisher,source_url,version,notes)
values
('RxNorm','U.S. National Library of Medicine','https://rxnav.nlm.nih.gov/','current','Drug concepts, ingredients, products and identifiers. RxNav drug-interaction endpoints were discontinued in January 2024; RxNorm is not treated as the interaction authority.'),
('PubMed','U.S. National Library of Medicine / NCBI','https://pubmed.ncbi.nlm.nih.gov/','current','Literature evidence and citations for drug-interaction records; PubMed search is evidence retrieval, not automatic clinical adjudication.'),
('Nigeria Essential Medicines List','Federal Ministry of Health and Social Welfare / WHO repository','https://extranet.who.int/cpcd/health-legislation/nigeria-essential-medicine-list-7th-edition','7th edition (2020)','National essential-medicine list. Verify against the latest Nigerian regulator/formulary before labeling a product as approved or marketed in Nigeria.'),
('WHO Model List of Essential Medicines','World Health Organization','https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists','24th list (2025)','Supplementary international essential-medicine reference; not a substitute for Nigerian regulatory authorization.')
on conflict(name) do update set publisher=excluded.publisher,source_url=excluded.source_url,version=excluded.version,notes=excluded.notes,retrieved_at=now();

-- RLS: reference data is readable by the public application; writes should use the server-side service role.
alter table public.data_sources enable row level security;
alter table public.medicine_list_memberships enable row level security;
alter table public.product_sources enable row level security;
alter table public.interaction_evidence enable row level security;

do $$ begin
  create policy "public read data sources" on public.data_sources for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public read medicine memberships" on public.medicine_list_memberships for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public read product sources" on public.product_sources for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public read interaction evidence" on public.interaction_evidence for select using (true);
exception when duplicate_object then null; end $$;
