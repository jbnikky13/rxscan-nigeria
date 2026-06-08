require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const drugs = [
  'paracetamol','amoxicillin','metformin','ibuprofen',
  'ciprofloxacin','artemether','amlodipine','lisinopril',
  'omeprazole','diazepam','doxycycline','azithromycin',
  'chloroquine','cotrimoxazole','folic acid'
];

async function seed() {
  console.log('🌱 Seeding drugs...\n');
  for (const drug of drugs) {
    try {
      const res = await axios.get(
        https://api.fda.gov/drug/label.json?search=openfda.generic_name:${drug}&limit=1
      );
      const label = res.data.results?.[0];
      if (!label) { console.log(`⚠️  No data: ${drug}`); continue; }

      const { error } = await supabase.from('ingredients').upsert({
        name: drug.charAt(0).toUpperCase() + drug.slice(1),
        drug_class: label.openfda?.pharm_class_epc?.[0] ?? 'Unknown',
        mechanism_of_action: label.mechanism_of_action?.[0]?.slice(0, 300) ?? null,
      }, { onConflict: 'name' });

      if (error) console.error(`❌ ${drug}:`, error.message);
      else console.log(`✅ Seeded: ${drug}`);
    } catch (e) {
      console.error(`❌ ${drug}:`, e.message);
    }
  }
  console.log('\n🎉 Done!');
}

seed();
