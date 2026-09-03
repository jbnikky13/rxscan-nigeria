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
const OPENFDA_LIMIT = Number(process.env.OPENFDA_LABELS_PER_INGREDIENT || 1);

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
if (!NCBI_EMAIL) throw new Error('NCBI_EMAIL is required.');

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const OPENFDA = 'https://api.fda.gov/drug/label.json';
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

function cleanLine(line) { return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/^\s*\d+[.)-]?\s*/, '').trim(); }

function candidate(line) {
  if (!line || line.length < 3 || line.length > 140 || !/[A-Za-z]/.test(line)) return false;
  if (/^(chapter|section|contents|page|table|appendix|notes?|references?|foreword|acknowledg|all rights reserved|prof\.?|dr\.?|mrs?\.?|mr\.?)/i.test(line)) return false;
  if (/^(cardiovascular|anti[- ]infective|gastrointestinal|central nervous|respiratory|obstetric|oncology|dermatology|ophthalmic|ear|nose|throat|blood|endocrine|mental health|immunological|musculoskeletal|nutrition|anaesthesia|antidotes)/i.test(line)) return false;
  return /\b(?:mg|mcg|µg|g|kg|ml|mL|iu|units?|%|mmol|mol|tablet|tablets|capsule|capsules|injection|solution|suspension|syrup|cream|ointment|gel|drops?|inhaler|vial|ampoule|patch|suppository)\b/i.test(line);
}

async function extractNemlNames() {
  const dir = path.resolve('data'); await fs.mkdir(dir, { recursive: true });
  const pdf = path.join(dir, 'nigeria-neml.pdf'); const txt = path.join(dir, 'nigeria-neml.txt');
  const response = await fetch(NEML_URL, { headers: { 'User-Agent': 'RxScan-Nigeria/1.0' } });
  if (!response.ok) throw new Error(`NEML download failed: ${response.status}`);
  await fs.writeFile(pdf, Buffer.from(await response.arrayBuffer()));
  await execFileAsync('pdftotext', ['-layout', pdf, txt]);
  const text = await fs.readFile(txt, 'utf8');
  return [...new Set(text.split(/\r?\n/).map(cleanLine).filter(candidate))].slice(0, MAX_MEDICINES);
}

function normalizeRxName(value) {
  return value.toLowerCase().replace(/[×x]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|kg|ml|iu|units?|%|mmol|mol)\b/gi, ' ')
    .replace(/\b(?:tablet|tablets|tab|capsule|capsules|cap|injection|injectable|solution|suspension|syrup|cream|ointment|gel|drops?|inhaler|vial|ampoule|ampoules|patch|suppository|oral|iv|im|sc|po)\b/gi, ' ')
    .replace(/[(),;:/\\]+/g, ' ').replace(/[^a-z0-9+\-. ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function rxnormQueryVariants(name) {
  const normalized = normalizeRxName(name); const words = normalized.split(' ').filter(Boolean);
  const variants = [name.trim(), normalized];
  if (words.length > 1) variants.push(words.slice(0, 2).join(' '), words.slice(0, 3).join(' '));
  if (words.length > 3) variants.push(words.slice(0, 4).join(' '));
  return [...new Set(variants.filter(v => v.length >= 3))];
}

async function rxnormSearch(name) {
  for (const query of rxnormQueryVariants(name)) {
    const data = await json(`${RXNAV}/drugs.json?name=${encodeURIComponent(query)}`);
    const concepts = (data?.drugGroup?.conceptGroup || []).flatMap(group => group.conceptProperties || []).filter(Boolean);
    if (concepts.length) return concepts;
  }
  const approximate = await json(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(normalizeRxName(name))}&maxEntries=10`);
  const candidates = approximate?.approximateGroup?.candidate || []; const concepts = [];
  for (const item of candidates) {
    if (!item.rxcui) continue;
    try { const props = await json(`${RXNAV}/rxcui/${encodeURIComponent(item.rxcui)}/properties.json`); if (props?.properties) concepts.push(props.properties); } catch {}
  }
  return concepts;
}

async function rxnormProducts(rxcui) {
  try {
    const data = await json(`${RXNAV}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=SCD%2BSBD%2BGPCK%2BBPCK`);
    return (data?.allRelatedGroup?.conceptGroup || data?.relatedGroup?.conceptGroup || []).flatMap(group => group.conceptProperties || []).filter(c => ['SCD','SBD','GPCK','BPCK'].includes(c.tty)).slice(0, MAX_PRODUCTS_PER_MEDICINE);
  } catch { return []; }
}

function pickIngredientConcept(concepts) { return concepts.filter(c => ['IN','PIN','MIN'].includes(c.tty)).sort((a,b) => (a.name || '').length - (b.name || '').length)[0] || null; }

async function upsertIngredient(concept, rxSource) {
  const { data: existing, error: lookupError } = await db.from('ingredients').select('id,name,rxcui').eq('rxcui', String(concept.rxcui)).limit(1).maybeSingle();
  if (lookupError) throw lookupError; if (existing) return existing;
  const { data, error } = await db.from('ingredients').insert({ name: concept.name, rxcui: String(concept.rxcui), source_id: rxSource, source_updated_at: new Date().toISOString() }).select('id,name,rxcui').single();
  if (error) { const retry = await db.from('ingredients').select('id,name,rxcui').eq('rxcui', String(concept.rxcui)).limit(1).maybeSingle(); if (retry.error) throw retry.error; if (retry.data) return retry.data; throw error; }
  return data;
}

async function upsertProduct(concept, ingredientId, rxSource) {
  const { data: existing, error: lookupError } = await db.from('products').select('id').eq('rxcui', String(concept.rxcui)).limit(1).maybeSingle();
  if (lookupError) throw lookupError; let productId = existing?.id;
  if (!productId) { const { data, error } = await db.from('products').insert({ name: concept.name, rxcui: String(concept.rxcui), tty: concept.tty || null, source_id: rxSource, source_updated_at: new Date().toISOString() }).select('id').single(); if (error) throw error; productId = data.id; }
  const { data: mappingExists, error: mappingLookupError } = await db.from('product_ingredients').select('product_id').eq('product_id', productId).eq('ingredient_id', ingredientId).limit(1).maybeSingle();
  if (mappingLookupError) throw mappingLookupError;
  if (!mappingExists) { const { error } = await db.from('product_ingredients').insert({ product_id: productId, ingredient_id: ingredientId }); if (error) throw error; }
  return productId;
}

async function upsertNemlMembership(ingredientId, medicineName, sourceIdValue) {
  const { data: existing, error: lookupError } = await db.from('neml_memberships').select('id').eq('ingredient_id', ingredientId).eq('medicine_name', medicineName).eq('edition', NEML_EDITION).limit(1).maybeSingle();
  if (lookupError) throw lookupError;
  const payload = { ingredient_id: ingredientId, medicine_name: medicineName, edition: NEML_EDITION, dosage_form: null, strength: null, source_id: sourceIdValue, evidence: `NEML source row: ${medicineName}` };
  if (existing) { const { error } = await db.from('neml_memberships').update(payload).eq('id', existing.id); if (error) throw error; }
  else { const { error } = await db.from('neml_memberships').insert(payload); if (error) throw error; }
}

function normalizedTokens(value) { return normalizeRxName(value).split(/\s+/).filter(w => w.length >= 4); }

async function populateInteractionPairs(ingredients, openFdaSource) {
  const known = ingredients.map(i => ({ ...i, norm: normalizeRxName(i.name) })).filter(i => i.norm.length >= 4);
  const pairKeys = new Set(); let created = 0; let evidence = 0;
  for (const ingredient of known) {
    if (created >= MAX_INTERACTION_PAIRS) break;
    try {
      const term = `openfda.substance_name:"${ingredient.name.replace(/"/g, '')}"`;
      const url = `${OPENFDA}?search=${encodeURIComponent(term)}&limit=${OPENFDA_LIMIT}`;
      const data = await json(url);
      const labels = data?.results || [];
      const interactionText = labels.map(l => (l.drug_interactions || []).join('\n')).join('\n');
      if (!interactionText) continue;
      const textNorm = normalizeRxName(interactionText);
      for (const other of known) {
        if (other.id === ingredient.id || !textNorm.includes(other.norm)) continue;
        const [a,b] = [ingredient.id, other.id].sort(); const key = `${a}:${b}`;
        if (pairKeys.has(key)) continue; pairKeys.add(key);
        const { data: existing, error: findError } = await db.from('drug_interactions').select('id').eq('ingredient_a_id', a).eq('ingredient_b_id', b).limit(1).maybeSingle();
        if (findError) throw findError;
        let interactionId = existing?.id;
        if (!interactionId) {
          const { data: inserted, error } = await db.from('drug_interactions').insert({ ingredient_a_id: a, ingredient_b_id: b }).select('id').single();
          if (error) throw error; interactionId = inserted.id; created++;
        }
        const { data: evidenceExists, error: evidenceLookupError } = await db.from('interaction_evidence').select('id').eq('interaction_id', interactionId).eq('source_id', openFdaSource).limit(1).maybeSingle();
        if (evidenceLookupError) throw evidenceLookupError;
        if (!evidenceExists) {
          const { error } = await db.from('interaction_evidence').insert({ interaction_id: interactionId, ingredient_a_id: a, ingredient_b_id: b, pmid: null, title: `FDA prescribing information: ${ingredient.name}`, journal: 'openFDA Drug Labeling', publication_year: null, source_id: openFdaSource, source_url: 'https://open.fda.gov/apis/drug/label/' });
          if (error) throw error; evidence++;
        }
        if (created >= MAX_INTERACTION_PAIRS) break;
      }
    } catch (error) {
      if (!String(error.message).includes('404')) console.warn(`Skipping FDA interaction lookup for ${ingredient.name}: ${error.message}`);
    }
    await sleep(120);
  }
  return { created, evidence };
}

async function enrichPubMed(pubmedSourceId) {
  const { data: pairs, error: pairError } = await db.from('drug_interactions').select('id,ingredient_a_id,ingredient_b_id').limit(MAX_INTERACTION_PAIRS);
  if (pairError) throw pairError; let evidenceRows = 0;
  for (const pair of pairs || []) {
    const [{ data: a }, { data: b }] = await Promise.all([db.from('ingredients').select('name').eq('id', pair.ingredient_a_id).single(), db.from('ingredients').select('name').eq('id', pair.ingredient_b_id).single()]);
    if (!a || !b) continue;
    const term = `(${a.name}[Title/Abstract]) AND (${b.name}[Title/Abstract]) AND (drug interaction[Title/Abstract] OR drug-drug interaction[Title/Abstract])`;
    const params = new URLSearchParams({ db:'pubmed', term, retmode:'json', retmax:'5', sort:'relevance', tool:'RxScanNigeria', email:NCBI_EMAIL }); if (NCBI_API_KEY) params.set('api_key', NCBI_API_KEY);
    try {
      const search = await json(`${EUTILS}/esearch.fcgi?${params}`); const ids = search?.esearchresult?.idlist || []; if (!ids.length) continue;
      await sleep(NCBI_API_KEY ? 120 : 350);
      const summaryParams = new URLSearchParams({ db:'pubmed', id:ids.join(','), retmode:'json', tool:'RxScanNigeria', email:NCBI_EMAIL }); if (NCBI_API_KEY) summaryParams.set('api_key', NCBI_API_KEY);
      const summary = await json(`${EUTILS}/esummary.fcgi?${summaryParams}`);
      for (const pmid of ids) {
        const item = summary?.result?.[pmid] || {};
        const { data: exists, error: lookupError } = await db.from('interaction_evidence').select('id').eq('interaction_id', pair.id).eq('pmid', pmid).limit(1).maybeSingle();
        if (lookupError) throw lookupError; if (exists) continue;
        const { error } = await db.from('interaction_evidence').insert({ interaction_id:pair.id, ingredient_a_id:pair.ingredient_a_id, ingredient_b_id:pair.ingredient_b_id, pmid, title:item.title || null, journal:item.fulljournalname || item.source || null, publication_year:Number((item.pubdate || '').slice(0,4)) || null, source_id:pubmedSourceId, source_url:`https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
        if (error) throw error; evidenceRows++;
      }
    } catch (error) { console.warn(`Skipping PubMed pair ${a.name} + ${b.name}: ${error.message}`); }
    await sleep(NCBI_API_KEY ? 120 : 350);
  }
  return { pairs: pairs?.length || 0, evidenceRows };
}

async function main() {
  const rxSource = await sourceId('NLM RxNorm','rxnorm','current','https://www.nlm.nih.gov/research/umls/rxnorm/');
  const nemlSource = await sourceId('Nigeria Essential Medicines List','neml',NEML_EDITION,NEML_URL);
  const pubmedSourceId = await sourceId('NCBI PubMed','pubmed','E-utilities','https://www.ncbi.nlm.nih.gov/books/NBK25497/');
  const openFdaSource = await sourceId('FDA openFDA Drug Labeling','openfda','current','https://open.fda.gov/apis/drug/label/');
  const names = await extractNemlNames(); console.log(`NEML candidates: ${names.length}`);
  const matchedRxcuis = new Set(); let membershipRows = 0; let productRows = 0;
  for (const nemlName of names) {
    try {
      const concepts = await rxnormSearch(nemlName); const ingredientConcept = pickIngredientConcept(concepts); if (!ingredientConcept) continue;
      const ingredient = await upsertIngredient(ingredientConcept, rxSource); matchedRxcuis.add(String(ingredient.rxcui));
      const directProducts = concepts.filter(c => ['SCD','SBD','GPCK','BPCK'].includes(c.tty)).slice(0, MAX_PRODUCTS_PER_MEDICINE);
      const productConcepts = directProducts.length ? directProducts : await rxnormProducts(ingredient.rxcui);
      for (const product of productConcepts) { await upsertProduct(product, ingredient.id, rxSource); productRows++; }
      await upsertNemlMembership(ingredient.id, nemlName, nemlSource); membershipRows++;
    } catch (error) { console.warn(`Skipping NEML item ${nemlName}: ${error.message}`); }
    await sleep(75);
  }
  const { data: ingredients, error: ingredientError } = await db.from('ingredients').select('id,name,rxcui').limit(MAX_MEDICINES); if (ingredientError) throw ingredientError;
  const interactionResult = await populateInteractionPairs(ingredients || [], openFdaSource);
  const pubmedResult = await enrichPubMed(pubmedSourceId);
  console.log(JSON.stringify({ neml_candidates:names.length, neml_linked:membershipRows, rxnorm_ingredients:matchedRxcuis.size, rxnorm_products:productRows, curated_interaction_pairs:interactionResult.created, interaction_evidence:interactionResult.evidence, pubmed_pairs:pubmedResult.pairs, pubmed_evidence:pubmedResult.evidenceRows }));
}

main().catch(error => { console.error(error); process.exit(1); });
