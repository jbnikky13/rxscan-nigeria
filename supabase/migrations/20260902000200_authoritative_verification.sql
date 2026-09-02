-- Verification helper used by CI. It does not mutate drug data.
create or replace function public.verify_interaction_pairs()
returns table (
  duplicate_pairs bigint,
  invalid_pairs bigint,
  evidence_without_ingredients bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized_pairs as (
    select least(ingredient_a_id, ingredient_b_id) as a,
           greatest(ingredient_a_id, ingredient_b_id) as b,
           count(*) as c
    from public.drug_interactions
    group by 1,2
  )
  select
    coalesce((select count(*) from normalized_pairs where c > 1), 0)::bigint,
    coalesce((select count(*) from public.drug_interactions d
              left join public.ingredients a on a.id = d.ingredient_a_id
              left join public.ingredients b on b.id = d.ingredient_b_id
              where a.id is null or b.id is null), 0)::bigint,
    coalesce((select count(*) from public.interaction_evidence e
              left join public.ingredients a on a.id = e.ingredient_a_id
              left join public.ingredients b on b.id = e.ingredient_b_id
              where a.id is null or b.id is null), 0)::bigint;
$$;
