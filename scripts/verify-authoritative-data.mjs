import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const tables = ['drug_sources','ingredients','products','product_ingredients','drug_aliases','neml_memberships','drug_interactions','interaction_evidence','prescription_scans'];
const counts = {};
for (const table of tables) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  counts[table] = count ?? 0;
}
console.table(counts);

for (const table of ['ingredients','products','product_ingredients','neml_memberships']) {
  if (counts[table] === 0) throw new Error(`Verification failed: ${table} is empty.`);
}

const { data: integrity, error: integrityError } = await db.rpc('verify_interaction_pairs');
if (integrityError) throw new Error(`Interaction integrity check failed: ${integrityError.message}`);
const result = integrity?.[0] || {};
if (Number(result.duplicate_pairs || 0) > 0) throw new Error(`Duplicate interaction pairs: ${result.duplicate_pairs}`);
if (Number(result.invalid_pairs || 0) > 0) throw new Error(`Invalid interaction pairs: ${result.invalid_pairs}`);
if (Number(result.evidence_without_ingredients || 0) > 0) throw new Error(`Evidence rows with missing ingredients: ${result.evidence_without_ingredients}`);

console.log(`NEML rows: ${counts.neml_memberships}`);
console.log(`RxNorm ingredients: ${counts.ingredients}`);
console.log(`RxNorm products: ${counts.products}`);
console.log(`Product/ingredient mappings: ${counts.product_ingredients}`);
console.log(`Curated interaction pairs: ${counts.drug_interactions}`);
console.log(`PubMed evidence rows: ${counts.interaction_evidence}`);
console.log('Authoritative data verification passed.');
