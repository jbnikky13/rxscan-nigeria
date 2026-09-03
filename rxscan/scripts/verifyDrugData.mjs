import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function count(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

const tables = [
  'ingredients',
  'products',
  'product_ingredients',
  'neml_memberships',
  'drug_interactions',
  'interaction_evidence',
];

const counts = {};
for (const table of tables) counts[table] = await count(table);

console.table(counts);

if (counts.ingredients === 0) throw new Error('Verification failed: no RxNorm ingredients were loaded.');
if (counts.products === 0) throw new Error('Verification failed: no RxNorm products were loaded.');
if (counts.product_ingredients === 0) throw new Error('Verification failed: no product/ingredient mappings were loaded.');
if (counts.neml_memberships === 0) throw new Error('Verification failed: no Nigerian NEML memberships were loaded.');

console.log('Drug-data verification passed.');
console.log(`RxNorm ingredients: ${counts.ingredients}`);
console.log(`RxNorm products: ${counts.products}`);
console.log(`Product/ingredient mappings: ${counts.product_ingredients}`);
console.log(`NEML memberships: ${counts.neml_memberships}`);
console.log(`Interaction pairs: ${counts.drug_interactions}`);
console.log(`PubMed evidence rows: ${counts.interaction_evidence}`);

if (counts.drug_interactions === 0) {
  console.warn('No curated drug interaction pairs are loaded yet; interaction enrichment is pending.');
}
if (counts.interaction_evidence === 0) {
  console.warn('No PubMed interaction evidence is loaded yet; evidence enrichment is pending.');
}
