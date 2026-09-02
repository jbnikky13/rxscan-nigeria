const required = [
  'drug_sources', 'ingredients', 'products', 'product_ingredients',
  'drug_aliases', 'neml_memberships', 'drug_interactions',
  'interaction_evidence', 'prescription_scans'
];

const expected = process.env.RXSCAN_EXPECTED_TABLES?.split(',').map(s => s.trim()).filter(Boolean) || required;
const missing = expected.filter(t => !required.includes(t));
if (missing.length) {
  console.error(`Unknown expected tables: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Authoritative schema expects ${expected.length} tables:`);
for (const table of expected) console.log(`- ${table}`);
console.log('Schema validation definition loaded successfully. Live SQL verification requires Supabase credentials.');
