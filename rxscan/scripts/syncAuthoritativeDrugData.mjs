import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NCBI_EMAIL = process.env.NCBI_EMAIL;
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const MAX_MEDICINES = Number(process.env.MAX_MEDICINES || 1000);
const MAX_INTERACTION_PAIRS = Number(process.env.MAX_INTERACTION_PAIRS || 500);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
if (!NCBI_EMAIL) throw new Error('NCBI_EMAIL is required.');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NIGERIA_NEML_URL = 'https://extranet.who.int/cpcd/sites/default/files/public_file_repository/NGA_Nigeria-Essential-Medicine-List_2020.pdf';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': `RxScan-Nigeria/1.0 (${NCBI_EMAIL})` } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

function normaliseName(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/^\d+[.)\-]?\s*/, '').trim();
}

function looksLikeMedicine(line) {
  if (!line || line.length < 3 || line.length > 140) return false;
  if (/^(chapter|section|contents|page|table|appendix|notes?|introduction|references?)\b/i.test(line)) return false;
  return /[A-Za-z]/.test(line);
}

async function downloadNEML() {
  const out = path.resolve('data/nigeria-neml-7th-edition.pdf');
  await fs.mkdir(path.dirname(out), { recursive: true });
  const res = await fetch(NIGERIA_NEML_URL);
  if (!res.ok) throw new Error(`Nigeria NEML download failed: ${res.status}`);
  await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

async function extractNEMLNames(pdfPath) {
  const txtPath = pdfPath.replace(/\.pdf$/i, '.txt');
  try {
    await execFileAsync('pdftotext', ['-layout', pdfPath, txtPath]);
  } catch {
    throw new Error('pdftotext is required for NEML extraction.');
  }
  const text = await fs.readFile(txtPath, 'utf8');
  return [...new Set(text.split(/\r?\n/).map(normaliseName).filter(looksLikeMedicine))].slice(0, MAX_MEDICINES);
}

async function rxnormDrugs(name) {
  const data = await getJson(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`);
  return (data?.drugGroup?.conceptGroup || [])
    .flatMap(g => g.conceptProperties || [])
    .filter(c => ['IN','MIN','PIN','SBD','SCD','BPCK','GPCK'].includes(c.tty));
}

async function upsertIngredient(concept) {
  const { data, error } = await supabase.from('ingredients').upsert({
    name: concept.name,
    rxcui: String(concept.rxcui),
    source_system: 'RxNorm',
    source_id: String(concept.rxcui),
    source_version: 'current',
    verified_at: new Date().toISOString()
  }, { onConflict: 'source_system,source_id' }).select('id,name,rxcui').single();
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
    prescription_required: false,
    available_in_nigeria: false,
    source_system: 'RxNorm',
    source_id: String(concept.rxcui),
    source_version: 'current',
    verified_at: new Date().toISOString()
  }, { onConflict: 'source_system,source_id' }).select('id').single();
  if (error) throw error;

  const map = await supabase.from('product_ingredient_map').upsert(
    { product_id: data.id, ingredient_id: ingredientId },
    { onConflict: 'product_id,ingredient_id' }
  );
  if (map.error) throw map.error;

  const src = await supabase.from('product_sources').upsert({
    product_id: data.id,
    source_name: 'RxNorm',
    source_id: String(concept.rxcui),
    source_url: `https://rxnav.nlm.nih.gov/REST/rxcui/${concept.rxcui}/properties.json`,
    metadata: { tty: concept.tty, synonym: concept.synonym || null }
  }, { onConflict: 'product_id,source_name,source_id' });
  if (src.error) throw src.error;
}

async function pubmedEvidence(drugA, drugB) {
  const term = `"${drugA}" AND "${drugB}" AND (drug interaction OR drug-drug interaction OR pharmacokinetic interaction OR pharmacodynamic interaction)`;
  const p = new URLSearchParams({ db: 'pubmed', term, retmode: 'json', retmax: '5', sort: 'relevance', email: NCBI_EMAIL });
  if (NCBI_API_KEY) p.set('api_key', NCBI_API_KEY);
  const search = await getJson(`${EUTILS}/esearch.fcgi?${p}`);
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const s = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'json', email: NCBI_EMAIL });
  if (NCBI_API_KEY) s.set('api_key', NCBI_API_KEY);
  const summary = await getJson(`${EUTILS}/esummary.fcgi?${s}`);
  return ids.map(pmid => {
    const x = summary?.result?.[pmid] || {};
    return { pmid, title: x.title || null, journal: x.fulljournalname || x.source || null, publication_year: Number((x.pubdate || '').slice(0, 4)) || null };
  });
}

async function main() {
  console.log('Downloading official Nigeria Essential Medicines List…');
  const pdfPath = await downloadNEML();
  const names = await extractNEMLNames(pdfPath);
  console.log(`Candidate lines: ${names.length}`);

  const ingredients = new Map();
  for (const name of names) {
    try {
      const concepts = await rxnormDrugs(name);
      const ingredientConcept = concepts.find(c => ['IN','MIN','PIN'].includes(c.tty));
      if (!ingredientConcept) continue;
      const ingredient = await upsertIngredient(ingredientConcept);
      ingredients.set(ingredient.id, ingredient);

      for (const product of concepts.filter(c => ['SBD','SCD','BPCK','GPCK'].includes(c.tty)).slice(0, 100)) {
        await upsertProduct(product, ingredient.id);
      }

      const membership = await supabase.from('medicine_list_memberships').upsert({
        ingredient_id: ingredient.id,
        list_name: 'Nigeria Essential Medicines List',
        country_code: 'NG',
        edition: '7th edition (2020)',
        status: 'listed',
        source_url: NIGERIA_NEML_URL
      }, { onConflict: 'ingredient_id,list_name,edition' });
      if (membership.error) throw membership.error;
    } catch (err) {
      console.warn(`Skipping ${name}: ${err.message}`);
    }
    await sleep(75);
  }

  const list = [...ingredients.values()];
  let pairs = 0;
  for (let i = 0; i < list.length && pairs < MAX_INTERACTION_PAIRS; i++) {
    for (let j = i + 1; j < list.length && pairs < MAX_INTERACTION_PAIRS; j++) {
      const a = list[i], b = list[j];
      try {
        const evidence = await pubmedEvidence(a.name, b.name);
        for (const e of evidence) {
          const result = await supabase.from('interaction_evidence').upsert({
            ingredient_a_id: a.id,
            ingredient_b_id: b.id,
            pmid: e.pmid,
            title: e.title,
            journal: e.journal,
            publication_year: e.publication_year
          }, { onConflict: 'ingredient_a_id,ingredient_b_id,pmid' });
          if (result.error) console.warn('Evidence insert:', result.error.message);
        }
      } catch (err) {
        console.warn(`PubMed failed for ${a.name} + ${b.name}: ${err.message}`);
      }
      pairs++;
      await sleep(NCBI_API_KEY ? 40 : 120);
    }
  }

  console.log(`Sync complete: ${list.length} ingredients, ${pairs} PubMed pairs reviewed.`);
  console.log('RxNav interaction endpoints are discontinued; this pipeline intentionally stores PubMed evidence rather than inventing interaction severity.');
}

main().catch(err => { console.error(err); process.exit(1); });
