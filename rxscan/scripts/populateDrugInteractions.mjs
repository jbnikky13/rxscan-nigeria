import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_LABELS = Number(process.env.MAX_INTERACTION_LABELS || 150);
const MAX_MATCHES_PER_LABEL = Number(process.env.MAX_INTERACTION_MATCHES_PER_LABEL || 20);
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const FDA = 'https://api.fda.gov/drug/label.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'RxScan-Nigeria/1.0', accept: 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function containsDrug(text, name) {
  const n = normalize(name);
  if (n.length < 5) return false;
  const escaped = n.split(' ').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i').test(normalize(text));
}

async function sourceId() {
  const { data, error } = await db.from('drug_sources').upsert({
    source_name: 'U.S. FDA openFDA Drug Labels',
    source_type: 'drug_label',
    source_version: 'current',
    source_url: 'https://open.fda.gov/apis/drug/label/',
    retrieved_at: new Date().toISOString()
  }, { onConflict: 'source_name,source_version' }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const fdaSource = await sourceId();
  const { data: ingredients, error } = await db.from('ingredients').select('id,name,rxcui').order('name').limit(1000);
  if (error) throw error;
  const { data: memberships, error: membershipError } = await db.from('neml_memberships').select('ingredient_id').limit(2000);
  if (membershipError) throw membershipError;
  const nemlIds = new Set((memberships || []).map(x => x.ingredient_id));
  const scoped = (ingredients || []).filter(x => nemlIds.has(x.id));
  const names = scoped.map(x => ({ ...x, norm: normalize(x.name) })).filter(x => x.norm.length >= 5);
  const byId = new Map(names.map(x => [x.id, x]));
  const processed = new Set();
  let pairsCreated = 0;
  let evidenceCreated = 0;
  let labelsRead = 0;

  for (const ingredient of names.slice(0, MAX_LABELS)) {
    if (processed.has(ingredient.id)) continue;
    const q = encodeURIComponent(`openfda.generic_name:"${ingredient.name}"`);
    let payload;
    try { payload = await json(`${FDA}?search=${q}&limit=5`); } catch (e) { console.warn(`FDA lookup skipped ${ingredient.name}: ${e.message}`); continue; }
    const results = payload?.results || [];
    labelsRead++;
    const labelText = results.map(r => (r.drug_interactions || []).join(' ')).join('\n');
    if (!labelText) { await sleep(100); continue; }

    const matches = [];
    for (const other of names) {
      if (other.id === ingredient.id) continue;
      if (containsDrug(labelText, other.name)) matches.push(other);
      if (matches.length >= MAX_MATCHES_PER_LABEL) break;
    }

    for (const other of matches) {
      const [a, b] = [ingredient, other].sort((x, y) => String(x.id).localeCompare(String(y.id)));
      const { data: existing, error: findError } = await db.from('drug_interactions').select('id').eq('ingredient_a_id', a.id).eq('ingredient_b_id', b.id).limit(1).maybeSingle();
      if (findError) throw findError;
      let interactionId = existing?.id;
      if (!interactionId) {
        const { data: created, error: createError } = await db.from('drug_interactions').insert({ ingredient_a_id: a.id, ingredient_b_id: b.id }).select('id').single();
        if (createError) throw createError;
        interactionId = created.id;
        pairsCreated++;
      }

      const label = results.find(r => (r.drug_interactions || []).join(' ').toLowerCase().includes(other.name.toLowerCase())) || results[0];
      const evidence = {
        interaction_id: interactionId,
        ingredient_a_id: a.id,
        ingredient_b_id: b.id,
        pmid: null,
        title: `FDA drug label: ${ingredient.name}`,
        journal: 'U.S. FDA openFDA Drug Labels',
        publication_year: label?.effective_time ? Number(String(label.effective_time).slice(0, 4)) || null : null,
        source_id: fdaSource,
        source_url: label?.id ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.id}` : 'https://open.fda.gov/apis/drug/label/'
      };
      const { data: evExists, error: evFindError } = await db.from('interaction_evidence').select('id').eq('interaction_id', interactionId).eq('source_id', fdaSource).eq('ingredient_a_id', a.id).eq('ingredient_b_id', b.id).limit(1).maybeSingle();
      if (evFindError) throw evFindError;
      if (!evExists) {
        const { error: evError } = await db.from('interaction_evidence').insert(evidence);
        if (evError) throw evError;
        evidenceCreated++;
      }
    }
    processed.add(ingredient.id);
    await sleep(120);
  }

  console.log(JSON.stringify({ labels_read: labelsRead, interaction_pairs_created: pairsCreated, interaction_evidence_created: evidenceCreated }));
}

main().catch(e => { console.error(e); process.exit(1); });
