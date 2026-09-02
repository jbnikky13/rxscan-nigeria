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
  'product_ingredient_map',
  'medicine_list_memberships',
  'interaction_evidence',
];

const counts = {};
for (const table of tables) counts[table] = await count(table);

console.table(counts);

if (counts.ingredients === 0) throw new Error('Verification failed: no ingredients were loaded.');
if (counts.products === 0) throw new Error('Verification failed: no RxNorm products were loaded.');
if (counts.product_ingredient_map === 0) throw new Error('Verification failed: no product/ingredient mappings were loaded.');
if (counts.medicine_list_memberships === 0) throw new Error('Verification failed: no Nigerian NEML memberships were loaded.');

console.log('Drug-data verification passed. PubMed evidence rows:', counts.interaction_evidence);
