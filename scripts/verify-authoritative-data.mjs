import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(url, key, { auth: { persistSession: false } });
const tables = ['drug_sources','ingredients','products','product_ingredients','drug_aliases','neml_memberships','drug_interactions','interaction_evidence','prescription_scans'];
for (const table of tables) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) { console.error(`${table}: ERROR ${error.message}`); process.exitCode = 1; }
  else console.log(`${table}: ${count}`);
}
const { data: dupes, error } = await db.rpc('verify_interaction_pairs');
if (error && !/function.*does not exist/i.test(error.message)) { console.error(error.message); process.exitCode = 1; }
else if (dupes) console.log(JSON.stringify(dupes));
