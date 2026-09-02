import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const BASE = 'https://rxnav.nlm.nih.gov/REST';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(path) {
  const r = await fetch(`${BASE}${path}.json`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`RxNorm ${r.status}: ${path}`);
  return r.json();
}
async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw error;
}

const version = await getJson('/version');
const rxVersion = version.rxnormdata?.version ?? version.version ?? 'current';
const { data: source, error: sourceError } = await db.from('drug_sources').upsert({
  source_name: 'NLM RxNorm', source_type: 'rxnorm', source_version: rxVersion,
  source_url: 'https://www.nlm.nih.gov/research/umls/rxnorm/', metadata: { api_version: version.rxnormdata?.apiVersion ?? version.apiVersion ?? null }
}, { onConflict: 'source_name,source_version' }).select('id').single();
if (sourceError) throw sourceError;

// RxNorm exposes current concepts by TTY. We ingest ingredients (IN/ PIN) and prescribable semantic drug products (SCD/SBD).
for (const tty of ['IN', 'PIN', 'SCD', 'SBD']) {
  const data = await getJson(`/allconcepts?tty=${encodeURIComponent(tty)}`);
  const concepts = data.rxnormdata?.minConceptGroup?.minConcept ?? data.minConceptGroup?.minConcept ?? [];
  const rows = concepts.map(c => ({ name: c.name, rxcui: String(c.rxcui), tty, source_id: source.id, source_updated_at: new Date().toISOString() }));
  if (tty === 'IN' || tty === 'PIN') await upsert('ingredients', rows.map(({tty: _tty, ...r}) => r), 'rxcui');
  else await upsert('products', rows, 'rxcui');
  console.log(`RxNorm ${tty}: ${rows.length}`);
  await sleep(350);
}
console.log(`RxNorm ingestion complete: ${rxVersion}`);
