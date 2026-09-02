import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.NCBI_EMAIL;
const API_KEY = process.env.NCBI_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !EMAIL) throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NCBI_EMAIL are required');
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const params = new URLSearchParams({ db: 'pubmed', retmode: 'json', tool: 'RxScanNigeria', email: EMAIL });
if (API_KEY) params.set('api_key', API_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(endpoint, extra = {}) {
  const q = new URLSearchParams(params); Object.entries(extra).forEach(([k,v]) => q.set(k, String(v)));
  const r = await fetch(`${EUTILS}/${endpoint}?${q}`); if (!r.ok) throw new Error(`NCBI ${r.status}`); return r.json();
}
const { data: source, error: se } = await db.from('drug_sources').select('id').eq('source_name','NCBI PubMed').order('retrieved_at',{ascending:false}).limit(1).single();
if (se) throw se;
const { data: pairs, error: pe } = await db.from('drug_interactions').select('id,ingredient_a_id,ingredient_b_id').limit(Number(process.env.PUBMED_MAX_PAIRS || 100));
if (pe) throw pe;
for (const pair of pairs || []) {
  const { data: a } = await db.from('ingredients').select('name').eq('id',pair.ingredient_a_id).single();
  const { data: b } = await db.from('ingredients').select('name').eq('id',pair.ingredient_b_id).single();
  if (!a || !b) continue;
  const term = `(${a.name}[Title/Abstract]) AND (${b.name}[Title/Abstract]) AND (drug interaction[Title/Abstract] OR interaction[Title/Abstract])`;
  const search = await call('esearch.fcgi', { term, retmax: 20, sort: 'relevance' });
  const ids = search.esearchresult?.idlist || [];
  await sleep(API_KEY ? 120 : 350);
  if (!ids.length) continue;
  const summary = await call('esummary.fcgi', { id: ids.join(','), retmax: ids.length });
  const result = summary.result || {};
  const rows = ids.map(pmid => {
    const x = result[pmid] || {};
    return { interaction_id: pair.id, ingredient_a_id: pair.ingredient_a_id, ingredient_b_id: pair.ingredient_b_id, pmid, title: x.title || null, journal: x.fulljournalname || x.source || null, publication_year: Number((x.pubdate || '').slice(0,4)) || null, source_id: source.id, source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
  });
  const { error } = await db.from('interaction_evidence').upsert(rows, { onConflict: 'pmid,ingredient_a_id,ingredient_b_id' });
  if (error) throw error;
  console.log(`${a.name} + ${b.name}: ${rows.length} PubMed records`);
  await sleep(API_KEY ? 120 : 350);
}
console.log('PubMed ingestion complete');
