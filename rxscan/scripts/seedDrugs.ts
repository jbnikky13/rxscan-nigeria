import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const drugs = [
  'paracetamol','amoxicillin','metformin','ibuprofen',
  'ciprofloxacin','artemether','amlodipine','lisinopril',
  'omeprazole','diazepam','doxycycline','azithromycin',
  'chloroquine','cotrimoxazole','folic acid'
];

async function seed() {
  console.log('🌱 Starting drug seed...\n');
  for (const drug of drugs) {
    try {
      const res = await axios.get(
        https://api.fda.gov/drug/label.json?search=openfda.generic_name:${drug}&limit=1
      );
      const label = res.data.results?.[0];
      if (!label) {
        console.log(`⚠️  No FDA data found for: ${drug}`);
        continue;
      }

      const { error } = await supabase.from('ingredients').upsert({
        name: drug.charAt(0).toUpperCase() + drug.slice(1),
        drug_class: label.openfda?.pharm_class_epc?.[0] ?? 'Unknown',
        mechanism_of_action: label.mechanism_of_action?.[0]?.slice(0, 300) ?? null,
        side_effects: label.adverse_reactions?.[0]
          ? [label.adverse_reactions[0].slice(0, 200)]
          : [],
        contraindications: label.contraindications?.[0]
          ? [label.contraindications[0].slice(0, 200)]
          : [],
      }, { onConflict: 'name' });

      if (error) {
        console.error(`❌ Supabase error for ${drug}:`, error.message);
      } else {
        console.log(`✅ Seeded: ${drug}`);
      }
    } catch (err: any) {
      console.error(`❌ Failed for ${drug}:`, err.message);
    }
  }
  console.log('\n🎉 Seed complete!');
}

seed();
