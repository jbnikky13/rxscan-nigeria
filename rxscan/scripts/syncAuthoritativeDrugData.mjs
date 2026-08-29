import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NCBI_EMAIL = process.env.NCBI_EMAIL;
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const MAX_MEDICINES = Number(process.env.MAX_MEDICINES || 1000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Never expose the service-role key in the browser.');
}
if (!NCBI_EMAIL) throw new Error('NCBI_EMAIL is required by this sync job.');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NIGERIA_NEML_URL = 'https://extranet.who.int/cpcd/sites/default/files/public_file_repository/NGA_Nigeria-Essential-Medicine-List_2020.pdf';
const WHO_EML_URL = 'https://www.who.int/publications/i/item/B09474';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': `RxScan-Nigeria/1.0 (${NCBI_EMAIL})` } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': `RxScan-Nigeria/1.0 (${NCBI_EMAIL})` } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

function normaliseName(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\d+[.)\-]?\s*/, '')
    .trim();
}

function looksLikeMedicine(line) {
  if (!line || line.length < 3 || line.length > 140) return false;
  if (/^(chapter|section|contents|page|table|appendix|notes?|introduction|references?)\b/i.test(line)) return false;
  return /[A-Za-z]/.test(line);
}

async function downloadNigeriaNEML() {
  const out = path.resolve('data/nigeria-neml-7th-edition.pdf');
  await fs.mkdir(path.dirname(out), { recursive: true });
  const res = await fetch(NIGERIA_NEML_URL);
  if (!res.ok) throw new Error(`Could not download Nigeria NEML: ${res.status}`);
  await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

async function extractNigeriaNames(pdfPath) {
  const buffer = await fs.readFile(pdfPath);
  const parsed = await pdf(buffer);
  const lines = parsed.text.split(/\r?\n/).map(normaliseName).filter(looksLikeMedicine);

  // The NEML is a formatted national list rather than a machine-readable API.
  // Keep only candidate medicine-name lines; RxNorm matching below decides what is a valid drug concept.
  return [...new Set(lines)].slice(0, MAX_MEDICINES);
}

async function rxnormDrugs(name) {
  const url = `${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`;
  const data = await getJson(url);
  const groups = data?.drugGroup?.conceptGroup || [];
  const concepts = groups.flatMap(g => g.conceptProperties || []);
  return concepts.filter(c => ['IN','MIN','PIN','SBD','SCD','BPCK','GPCK'].includes(c.tty));
}

async function rxnormProducts(name) {
  const concepts = await rxnormDrugs(name);
  const seen = new Set();
  return concepts.filter(c => {
    if (seen.has(c.rxcui)) return false;
    seen.add(c.rxcui);
    return true;
  });
}

async function rxnormIngredients(rxcui) {
  const data = await getJson(`${RXNAV}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN%20MIN%20PIN`);
  const groups = data?.relatedGroup?.conceptGroup || [];
  return groups.flatMap(g => g.conceptProperties || []);
}

async function pubmedEvidence(drugA, drugB) {
  const term = `(${JSON.stringify(drugA)}) AND (${JSON.stringify(drugB)}) AND (drug interaction OR drug-drug interaction OR pharmacokinetic interaction OR pharmacodynamic interaction)`;
  const params = new URLSearchParams({ db: 'pubmed', term, retmode: 'json', retmax: '5', sort: 'relevance', email: NCBI_EMAIL });
  if (NCBI_API_KEY) params.set('api_key', NCBI_API_KEY);
  const search = await getJson(`${EUTILS}/esearch.fcgi?${params}`);
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const sumParams = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'json', email: NCBI_EMAIL });
  if (NCBI_API_KEY) sumParams.set('api_key', NCBI_API_KEY);
  const summary = await getJson(`${EUTILS}/esummary.fcgi?${sumParams}`);
  return ids.map(id => {
    const x = summary?.result?.[id] || {};
    return { pmid: id, title: x.title || null, journal: x.fulljournalname || x.source || null, publication_year: Number((x.pubdate || '').slice(0,4)) || null };
  });
}

async function upsertIngredient(name, rxcui) {
  const { data, error } = await supabase.from('ingredients').upsert({
    name,
    rxcui: String(rxcui),
    source_system: 'RxNorm',
    source_id: String(rxcui),
    source_version: 'current',
    verified_at: new Date().toISOString()
  }, { onConflict: 'rxcui' }).select('id,name,rxcui').single();
  if (error) throw error;
  return data;
}

async function upsertProduct(concept, ingredientId) {
  const { data, error } = await supabase.from('products').upsert({
    brand_name: concept.name,
    manufacturer: null,
    dosage_form: null,
    strength: null,
    route: null,
    prescription_required: null,
    available_in_nigeria: null,
    source_system: 'RxNorm',
    source_id: String(concept.rxcui),
    source_version: 'current',
    verified_at: new Date().toISOString()
  }, { onConflict: 'source_system,source_id' }).select('id').single();
  if (error) throw error;

  await supabase.from('product_ingredient_map').upsert({
    product_id: data.id,
    ingredient_id: ingredientId
  }, { onConflict: 'product_id,ingredient_id' });

  await supabase.from('product_sources').upsert({
    product_id: data.id,
    source_name: 'RxNorm',
    source_id: String(concept.rxcui),
    source_url: `https://rxnav.nlm.nih.gov/REST/rxcui/${concept.rxcui}/properties.json`,
    metadata: { tty: concept.tty, synonym: concept.synonym || null }
  }, { onConflict: 'product_id,source_name,source_id' });
}

async function addPubmedEvidence(ingredientA, ingredientB, evidence) {
  // Do not invent a severity or clinical recommendation from an abstract search.
  // Evidence is stored for pharmacist/clinical adjudication.
  for (const e of evidence) {
    await supabase.from('interaction_evidence').upsert({
      ingredient_a_id: ingredientA.id,
      ingredient_b_id: ingredientB.id,
      pmid: e.pmid,
      title: e.title,
      journal: e.journal,
      publication_year: e.publication_year
    }, { onConflict: 'ingredient_a_id,ingredient_b_id,pmid' });
  }
}

async function main() {
  console.log('Downloading Nigeria Essential Medicines List…');
  const pdfPath = await downloadNigeriaNEML();
  const names = await extractNigeriaNames(pdfPath);
  console.log(`Found ${names.length} candidate lines.`);

  const ingredientByName = new Map();
  for (const name of names) {
    try {
      const concepts = await rxnormProducts(name);
      const ingredientConcept = concepts.find(c => ['IN','MIN','PIN'].includes(c.tty));
      if (!ingredientConcept) continue;
      const ingredient = await upsertIngredient(ingredientConcept.name, ingredientConcept.rxcui);
      ingredientByName.set(name.toLowerCase(), ingredient);

      for (const product of concepts.filter(c => ['SBD','SCD','BPCK','GPCK'].includes(c.tty)).slice(0, 100)) {
        await upsertProduct(product, ingredient.id);
      }
      await supabase.from('medicine_list_memberships').upsert({
        ingredient_id: ingredient.id,
        list_name: 'Nigeria Essential Medicines List',
        country_code: 'NG',
        edition: '7th edition (2020)',
        status: 'listed',
        source_url: NIGERIA_NEML_URL
      }, { onConflict: 'ingredient_id,list_name,edition' });
    } catch (err) {
      console.warn(`Skipping ${name}:`, err.message);
    }
    await sleep(75);
  }

  // Evidence harvesting: pair only ingredients actually matched from the national list.
  // PubMed is used as literature evidence, not as an automatic severity engine.
  const ingredients = [...new Map(ingredientByName.values()).values()];
  const maxPairs = Number(process.env.MAX_INTERACTION_PAIRS || 500);
  let pairs = 0;
  for (let i = 0; i < ingredients.length && pairs < maxPairs; i++) {
    for (let j = i + 1; j < ingredients.length && pairs < maxPairs; j++) {
      const a = ingredients[i], b = ingredients[j];
      try {
        const evidence = await pubmedEvidence(a.name, b.name);
        if (evidence.length) await addPubmedEvidence(a, b, evidence);
      } catch (err) {
        console.warn(`PubMed search failed for ${a.name} + ${b.name}:`, err.message);
      }
      pairs++;
      await sleep(NCBI_API_KEY ? 40 : 120);
    }
  }

  console.log(`Sync complete. Matched ${ingredients.length} ingredients and reviewed ${pairs} PubMed pairs.`);
  console.log('IMPORTANT: RxNorm interaction endpoints were discontinued in Jan 2024; interaction severity must be clinically adjudicated before being shown as a definitive warning.');
}

main().catch(err => { console.error(err); process.exit(1); });
