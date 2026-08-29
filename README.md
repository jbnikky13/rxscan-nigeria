# RxScan Nigeria

RxScan Nigeria is a prescription-scanning and medication-information web application built with React, TypeScript, Tesseract OCR, Supabase and a server-side AI extraction endpoint.

## Current architecture

- React + TypeScript frontend in `rxscan/`
- Tesseract.js for browser OCR
- Supabase for ingredient, product, interaction and scan-history data
- Vercel serverless function at `api/claude.js` for AI extraction
- Anthropic API key stays server-side and is never bundled into the browser
- Vercel configuration is included at the repository root
- Supabase starter schema is in `supabase/schema.sql`

## Local development

```bash
cd rxscan
npm ci
cp .env.example .env.local
npm start
```

For local AI extraction, run the app through a Vercel-compatible environment or provide the `/api/claude` function with your preferred local serverless setup. Do not put `ANTHROPIC_API_KEY` in a `REACT_APP_*` variable.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Add your Supabase URL and anon/publishable key to the Vercel environment.
5. Run the seed scripts in `rxscan/scripts/` if you want the included drug dataset.

## Vercel deployment

Import the GitHub repository into Vercel. The root `vercel.json` already points the build to `rxscan/` and publishes `rxscan/build`.

Add these environment variables in Vercel:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (optional)
- `APP_ORIGIN` (recommended for production CORS)

Redeploy after adding or changing environment variables.

## Important security note

Prescription information can contain sensitive personal data. Before using this with real patient records, configure Supabase Auth and row-level security so each authenticated user can access only their own scan records. The included schema intentionally does not enable public read/write policies for prescription scans.

## Disclaimer

RxScan is an information and workflow tool, not a substitute for professional clinical judgment. Medication identification and interaction information should be independently verified by a qualified healthcare professional before clinical use.
