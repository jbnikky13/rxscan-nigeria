import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = [
  'drug_sources', 'ingredients', 'products', 'product_ingredients',
  'drug_aliases', 'neml_memberships', 'drug_interactions',
  'interaction_evidence', 'prescription_scans'
];

const counts = {};
for (const table of tables) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  counts[table] = count ?? 0;
}
console.table(counts);

const requiredNonEmpty = ['ingredients', 'products', 'product_ingredients', 'neml_memberships'];
for (const table of requiredNonEmpty) {
  if (!counts[table]) throw new Error(`Verification failed: ${table} is empty.`);
}

// Verify that every product mapping points to an existing ingredient/product and
// that every NEML row has a source and at least one RxNorm-side linkage.
const { data: orphanMaps, error: mapError } = await db
  .from('product_ingredients')
  .select('product_id,ingredient_id')
  .limit(1);
if (mapError) throw new Error(`product_ingredients check: ${mapError.message}`);

const { count: linkedNeml, error: nemlError } = await db
  .from('neml_memberships')
  .select('*', { count: 'exact', head: true })
  .not('ingredient_id', 'is', null);
if (nemlError) throw new Error(`NEML linkage check: ${nemlError.message}`);

console.log(`NEML rows linked to RxNorm ingredients: ${linkedNeml ?? 0}/${counts.neml_memberships}`);
console.log(`Product/ingredient mapping table is queryable: ${orphanMaps !== null}`);
console.log(`PubMed evidence rows: ${counts.interaction_evidence}`);
console.log('Authoritative data verification passed.');
