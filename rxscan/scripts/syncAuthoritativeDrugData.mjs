import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NCBI_EMAIL = process.env.NCBI_EMAIL;
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const MAX_MEDICINES = Number(process.env.MAX_MEDICINES || 1000);
const MAX_PRODUCTS_PER_MEDICINE = Number(process.env.MAX_PRODUCTS_PER_MEDICINE || 25);
const MAX_INTERACTION_PAIRS = Number(process.env.MAX_INTERACTION_PAIRS || 500);

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
if (!NCBI_EMAIL) throw new Error('NCBI_EMAIL is required.');

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NEML_URL = process.env.NEML_URL || 'https://www.health.gov.ng/wp-content/uploads/2025/08/Final-NEML-Adult-8th-Edition.pdf';
const NEML_EDITION = process.env.NEML_EDITION || '8th Edition 2024';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': `RxScan-Nigeria/1.0 (${NCBI_EMAIL})`, accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function sourceId(name, type, version, url) {
  const { data, error } = await db.from('drug_sources').upsert({ source_name: name, source_type: type, source_version: version, source_url: url, retrieved_at: new Date().toISOString() }, { onConflict: 'source_name,source_version' }).select('id').single();
  if (error) throw error;
  return data.id;
}

function cleanLine(line) {
  return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/^\s*\d+[.)-]?\s*/, '').trim();
}
function candidate(line) {
  if (!line || line.length < 3 || line.length > 140 || !/[A-Za-z]/.test(line)) return false;
  return !/^(chapter|section|contents|page|table|appendix|notes?|references?|foreword|acknowledg)/i.test(line);
}

async function extractNemlNames() {
  const dir = path.resolve('data');
  await fs.mkdir(dir, { recursive: true });
  const pdf = path.join(dir, 'nigeria-neml.pdf');
  const txt = path.join(dir, 'nigeria-neml.txt');
  const response = await fetch(NEML_URL, { headers: { 'User-Agent': 'RxScan-Nigeria/1.0' } });
  if (!response.ok) throw new Error(`NEML download failed: ${response.status}`);
  await fs.writeFile(pdf, Buffer.from(await response.arrayBuffer()));
  await execFileAsync('pdftotext', ['-layout', pdf, txt]);
  const text = await fs.readFile(txt, 'utf8');
  return [...new Set(text.split(/\r?\n/).map(cleanLine).filter(candidate))].slice(0, MAX_MEDICINES);
}

async function rxnormSearch(name) {
  const data = await json(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
  return (data?.drugGroup?.conceptGroup || []).flatMap(group => group.conceptProperties || []).filter(Boolean);
}

async function upsertIngredient(concept, rxSource) {
  const { data, error } = await db.from('ingredients').upsert({
    name: concept.name,
    rxcui: String(concept.rxcui),
    source_id: rxSource,
    source_updated_at: new Date().toISOString()
  }, { onConflict: 'rxcui' }).select('id,name,rxcui').single();
  if (error) throw error;
  return data;
}

async function upsertProduct(concept, ingredientId, rxSource) {
  const { data, error } = await db.from('products').upsert({
    name: concept.name,
    rxcui: String(concept.rxcui),
    tty: concept.tty || null,
    source_id: rxSource,
    source_updated_at: new Date().toISOString()
  }, { onConflict: 'rxcui' }).select('id').single();
  if (error) throw error;
  const mapping = await db.from('product_ingredients').upsert({ product_id: data.id, ingredient_id: ingredientId }, { onConflict: 'product_id,ingredient_id' });
  if (mapping.error) throw mapping.error;
  return data.id;
}

async function main() {
  const rxSource = await sourceId('NLM RxNorm', 'rxnorm', 'current', 'https://www.nlm.nih.gov/research/umls/rxnorm/');
  const nemlSource = await sourceId('Nigeria Essential Medicines List', 'neml', NEML_EDITION, NEML_URL);
  await sourceId('NCBI PubMed', 'pubmed', 'E-utilities', 'https://www.ncbi.nlm.nih.gov/books/NBK25497/');

  const names = await extractNemlNames();
  console.log(`NEML candidates: ${names.length}`);
  const matched = [];
  let membershipRows = 0;

  for (const nemlName of names) {
    try {
      const concepts = await rxnormSearch(nemlName);
      const ingredientConcept = concepts.find(c => ['IN', 'PIN', 'MIN'].includes(c.tty));
      if (!ingredientConcept) continue;
      const ingredient = await upsertIngredient(ingredientConcept, rxSource);
      matched.push(ingredient);

      const productConcepts = concepts.filter(c => ['SCD', 'SBD', 'GPCK', 'BPCK'].includes(c.tty)).slice(0, MAX_PRODUCTS_PER_MEDICINE);
      for (const product of productConcepts) await upsertProduct(product, ingredient.id, rxSource);

      const membership = await db.from('neml_memberships').upsert({
        ingredient_id: ingredient.id,
        medicine_name: nemlName,
        edition: NEML_EDITION,
        source_id: nemlSource,
        evidence: `NEML source row: ${nemlName}`
      }, { onConflict: 'lower(medicine_name),edition,coalesce(dosage_form,\'\'),coalesce(strength,\'\')' });
      if (membership.error) throw membership.error;
      membershipRows++;
    } catch (error) {
      console.warn(`Skipping NEML item ${nemlName}: ${error.message}`);
    }
    await sleep(75);
  }

  // PubMed is evidence enrichment only. It does not create an interaction or severity classification.
  // Existing curated interaction pairs are enriched with bibliographic evidence.
  const { data: pairs, error: pairError } = await db.from('drug_interactions').select('id,ingredient_a_id,ingredient_b_id').limit(MAX_INTERACTION_PAIRS);
  if (pairError) throw pairError;
  const pubmedSource = await db.from('drug_sources').select('id').eq('source_name', 'NCBI PubMed').order('retrieved_at', { ascending: false }).limit(1).single();
  if (pubmedSource.error) throw pubmedSource.error;

  let evidenceRows = 0;
  for (const pair of pairs || []) {
    const [{ data: a }, { data: b }] = await Promise.all([
      db.from('ingredients').select('name').eq('id', pair.ingredient_a_id).single(),
      db.from('ingredients').select('name').eq('id', pair.ingredient_b_id).single()
    ]);
    if (!a || !b) continue;
    const term = `(${a.name}[Title/Abstract]) AND (${b.name}[Title/Abstract]) AND (drug interaction[Title/Abstract] OR drug-drug interaction[Title/Abstract])`;
    const params = new URLSearchParams({ db: 'pubmed', term, retmode: 'json', retmax: '10', sort: 'relevance', tool: 'RxScanNigeria', email: NCBI_EMAIL });
    if (NCBI_API_KEY) params.set('api_key', NCBI_API_KEY);
    const search = await json(`${EUTILS}/esearch.fcgi?${params}`);
    const ids = search?.esearchresult?.idlist || [];
    if (!ids.length) continue;
    await sleep(NCBI_API_KEY ? 120 : 350);
    const summaryParams = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'json', tool: 'RxScanNigeria', email: NCBI_EMAIL });
    if (NCBI_API_KEY) summaryParams.set('api_key', NCBI_API_KEY);
    const summary = await json(`${EUTILS}/esummary.fcgi?${summaryParams}`);
    const rows = ids.map(pmid => {
      const item = summary?.result?.[pmid] || {};
      return { interaction_id: pair.id, ingredient_a_id: pair.ingredient_a_id, ingredient_b_id: pair.ingredient_b_id, pmid, title: item.title || null, journal: item.fulljournalname || item.source || null, publication_year: Number((item.pubdate || '').slice(0, 4)) || null, source_id: pubmedSource.data.id, source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
    });
    const inserted = await db.from('interaction_evidence').upsert(rows, { onConflict: 'pmid,ingredient_a_id,ingredient_b_id' });
    if (inserted.error) throw inserted.error;
    evidenceRows += rows.length;
    await sleep(NCBI_API_KEY ? 120 : 350);
  }

  console.log(JSON.stringify({ neml_candidates: names.length, neml_linked: membershipRows, rxnorm_ingredients: matched.length, curated_interaction_pairs: pairs?.length || 0, pubmed_evidence: evidenceRows }));
}

main().catch(error => { console.error(error); process.exit(1); });
