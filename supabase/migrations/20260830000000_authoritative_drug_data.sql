-- RxScan Nigeria authoritative drug-data layer
-- Sources: RxNorm (NLM), Nigeria Essential Medicines List (7th ed.), PubMed/NCBI.
-- This migration stores provenance and evidence; it does NOT infer interaction severity from PubMed.

create extension if not exists pgcrypto;

alter table public.ingredients add column if not exists source_system text;
alter table public.ingredients add column if not exists source_id text;
alter table public.ingredients add column if not exists source_version text;
alter table public.ingredients add column if not exists verified_at timestamptz;

alter table public.products add column if not exists source_system text;
alter table public.products add column if not exists source_id text;
alter table public.products add column if not exists source_version text;
alter table public.products add column if not exists verified_at timestamptz;

create unique index if not exists ingredients_source_uidx
  on public.ingredients(source_system, source_id)
  where source_system is not null and source_id is not null;

create unique index if not exists products_source_uidx
  on public.products(source_system, source_id)
  where source_system is not null and source_id is not null;

create table if not exists public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_name text not null,
  source_id text not null,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  unique(product_id, source_name, source_id)
);

create table if not exists public.medicine_list_memberships (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  list_name text not null,
  country_code text not null default 'NG',
  edition text not null,
  status text not null default 'listed',
  source_url text not null,
  retrieved_at timestamptz not null default now(),
  unique(ingredient_id, list_name, edition)
);

create table if not exists public.interaction_evidence (
  id uuid primary key default gen_random_uuid(),
  ingredient_a_id uuid not null references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references public.ingredients(id) on delete cascade,
  pmid text not null,
  title text,
  journal text,
  publication_year integer,
  source_url text generated always as ('https://pubmed.ncbi.nlm.nih.gov/' || pmid || '/') stored,
  retrieved_at timestamptz not null default now(),
  check (ingredient_a_id <> ingredient_b_id),
  unique(ingredient_a_id, ingredient_b_id, pmid)
);

create index if not exists product_sources_product_idx on public.product_sources(product_id);
create index if not exists medicine_memberships_ingredient_idx on public.medicine_list_memberships(ingredient_id);
create index if not exists interaction_evidence_a_idx on public.interaction_evidence(ingredient_a_id);
create index if not exists interaction_evidence_b_idx on public.interaction_evidence(ingredient_b_id);
create index if not exists interaction_evidence_pmid_idx on public.interaction_evidence(pmid);

alter table public.prescription_scans add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists prescription_scans_user_idx on public.prescription_scans(user_id, created_at desc);

-- Reference data is publicly readable for medication resolution; all writes are performed by the service role.
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.product_ingredient_map enable row level security;
alter table public.product_sources enable row level security;
alter table public.medicine_list_memberships enable row level security;
alter table public.interaction_evidence enable row level security;
alter table public.drug_interactions enable row level security;
alter table public.drug_aliases enable row level security;
alter table public.prescription_scans enable row level security;

drop policy if exists "public read ingredients" on public.ingredients;
create policy "public read ingredients" on public.ingredients for select using (true);
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);
drop policy if exists "public read product ingredient map" on public.product_ingredient_map;
create policy "public read product ingredient map" on public.product_ingredient_map for select using (true);
drop policy if exists "public read product sources" on public.product_sources;
create policy "public read product sources" on public.product_sources for select using (true);
drop policy if exists "public read medicine memberships" on public.medicine_list_memberships;
create policy "public read medicine memberships" on public.medicine_list_memberships for select using (true);
drop policy if exists "public read interaction evidence" on public.interaction_evidence;
create policy "public read interaction evidence" on public.interaction_evidence for select using (true);
drop policy if exists "public read drug interactions" on public.drug_interactions;
create policy "public read drug interactions" on public.drug_interactions for select using (true);
drop policy if exists "public read drug aliases" on public.drug_aliases;
create policy "public read drug aliases" on public.drug_aliases for select using (true);

-- Scan history is private to the authenticated owner.
drop policy if exists "users read own scans" on public.prescription_scans;
create policy "users read own scans" on public.prescription_scans for select to authenticated using (user_id = auth.uid());
drop policy if exists "users insert own scans" on public.prescription_scans;
create policy "users insert own scans" on public.prescription_scans for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own scans" on public.prescription_scans;
create policy "users update own scans" on public.prescription_scans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete own scans" on public.prescription_scans;
create policy "users delete own scans" on public.prescription_scans for delete to authenticated using (user_id = auth.uid());

comment on table public.interaction_evidence is 'Bibliographic evidence from PubMed. Evidence is not a clinical severity classification.';
comment on table public.medicine_list_memberships is 'Membership in a named national essential-medicines list; not a blanket statement of regulatory approval.';
comment on column public.products.available_in_nigeria is 'Only set true when supported by a Nigeria-specific source; RxNorm alone does not establish Nigerian availability.';
