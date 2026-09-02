-- RxScan production hardening
-- RxNorm does not establish Nigerian commercial availability or prescription status.
-- Keep those flags conservative until a Nigeria-specific source supports them.

alter table public.products
  alter column available_in_nigeria set default false;

-- Existing RxNorm-imported rows should not be interpreted as proof of Nigerian availability.
update public.products
set available_in_nigeria = false
where source_system = 'RxNorm';

-- Keep the evidence table efficient for the two-ingredient lookup pattern used by the app.
create index if not exists interaction_evidence_pair_idx
  on public.interaction_evidence (ingredient_a_id, ingredient_b_id);

comment on column public.products.available_in_nigeria is
  'False by default. Set true only when supported by a Nigeria-specific source; RxNorm alone does not establish local availability.';
