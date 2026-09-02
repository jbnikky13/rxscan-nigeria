# Fresh Supabase rebuild

This branch contains the clean authoritative RxScan schema.

## Safety

Do not drop the existing production database until a backup/export has been made and the replacement schema has been reviewed. The migration is designed for a fresh database and uses `create table if not exists` for repeatability.

## Required environment values

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `NCBI_EMAIL`
- `NCBI_API_KEY` (optional; recommended for larger PubMed ingestion)

## Data flow

1. Register authoritative sources.
2. Ingest RxNorm ingredients/products.
3. Map products to ingredients.
4. Parse/curate Nigeria Essential Medicines List membership.
5. Resolve interaction pairs from an approved interaction source.
6. Retrieve PubMed evidence through NCBI E-utilities with rate limiting.
7. Verify counts, foreign-key integrity and duplicate pairs.
8. Expose only read-safe authoritative data to the browser through Supabase RLS.

## Clinical-data boundary

PubMed evidence is evidence metadata, not an automatically generated severity classification. Clinical severity and management should come from a validated interaction source and/or qualified clinical review.
