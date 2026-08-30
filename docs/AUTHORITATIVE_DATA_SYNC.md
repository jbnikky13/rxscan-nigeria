# RxScan authoritative drug-data sync

The repository now contains an automated pipeline for:

1. Applying the Supabase schema migration.
2. Downloading the Nigeria Essential Medicines List (7th edition, 2020) from the WHO CPCD repository.
3. Resolving NEML medicine names against the NLM RxNorm API.
4. Storing RxCUI/source provenance and RxNorm product concepts.
5. Recording Nigeria NEML membership separately from RxNorm product data.
6. Searching PubMed through NCBI E-utilities for drug-pair interaction evidence.
7. Storing PMID-level evidence without automatically assigning clinical severity.

## Required GitHub Actions secrets

Add these under **Repository → Settings → Secrets and variables → Actions → New repository secret**:

- `SUPABASE_URL` — the RxScan Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the RxScan Supabase service-role key. Never commit this value.
- `SUPABASE_DB_URL` — the direct PostgreSQL connection string for the RxScan project. Prefer the pooled connection string if the direct connection is unavailable to GitHub Actions.
- `NCBI_EMAIL` — an email address identifying the application to NCBI.
- `NCBI_API_KEY` — optional NCBI API key for higher request limits.

The workflow is `.github/workflows/sync-drug-data.yml` and can be started manually from the GitHub **Actions** tab.

## Important data-quality rules

- RxNorm is a US/NLM terminology source and does not by itself prove that a product is marketed or registered in Nigeria. RxNorm products are therefore stored with `available_in_nigeria = false` unless a Nigeria-specific source supports availability.
- The Nigeria Essential Medicines List is stored as a named national-list membership. It should not be presented as a blanket statement that every RxNorm product is NAFDAC-registered.
- PubMed is a bibliographic evidence source. The pipeline stores PMIDs, titles, journals and publication years; it does not infer `severe`, `moderate`, `mild`, or `contraindicated` classifications from search results.
- Clinical interaction severity should be populated only from an appropriate curated clinical interaction reference and/or pharmacist/clinical review.

## Sources

- Nigeria Essential Medicines List, 7th Edition (2020): WHO CPCD repository.
- RxNorm: U.S. National Library of Medicine RxNav API.
- PubMed: NCBI E-utilities.

See the repository's `supabase/migrations/20260830000000_authoritative_drug_data.sql` for the database layer.
