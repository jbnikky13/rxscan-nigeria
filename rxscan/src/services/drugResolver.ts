import { supabase } from './supabaseClient';

function normalizeDrugName(value: string) {
  return value
    .toLowerCase()
    .replace(/[×x]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|kg|ml|iu|units?|%|mmol|mol)\b/gi, ' ')
    .replace(/\b(?:tablet|tablets|tab|capsule|capsules|cap|injection|injectable|solution|suspension|syrup|cream|ointment|gel|drops?|inhaler|vial|ampoule|ampoules|patch|suppository|oral|iv|im|sc|po)\b/gi, ' ')
    .replace(/[^a-z0-9+\-. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resolve a prescription medicine to the authoritative RxNorm ingredient table. */
export async function resolveDrugName(name: string) {
  const clean = name.trim();
  if (!clean) return [];

  // The current production schema does not relate drug_aliases to ingredients,
  // so do not issue a broken foreign-table join. Search the authoritative
  // ingredient names directly and rank exact/normalized matches first.
  const normalized = normalizeDrugName(clean);
  const searchTerms = [...new Set([clean, normalized, normalized.split(' ').slice(0, 3).join(' ')].filter(Boolean))];
  const matches: any[] = [];

  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('ingredients')
      .select('id,name,rxcui,drug_class,mechanism_of_action,side_effects,contraindications,administration,food_interactions')
      .ilike('name', `%${term}%`)
      .limit(25);
    if (error) {
      console.error('Ingredient lookup error:', error);
      continue;
    }
    matches.push(...(data ?? []));
  }

  const unique = matches.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
  return unique.sort((a, b) => {
    const an = normalizeDrugName(a.name);
    const bn = normalizeDrugName(b.name);
    return Number(bn === normalized) - Number(an === normalized) || an.length - bn.length;
  });
}

export async function getProductsByIngredient(ingredientId: string) {
  if (!ingredientId) return [];
  const { data, error } = await supabase
    .from('product_ingredients')
    .select(`product:product_id (id, name, rxcui, tty, source_id, source_updated_at, created_at, updated_at)`)
    .eq('ingredient_id', ingredientId);
  if (error) {
    console.error('Product lookup error:', error);
    return [];
  }
  return data?.map((row: any) => row.product).filter(Boolean) ?? [];
}

/** NEML membership is evidence of inclusion in the named national list. */
export async function getMedicineListMemberships(ingredientId: string) {
  if (!ingredientId) return [];
  const { data, error } = await supabase
    .from('neml_memberships')
    .select('id, medicine_name, edition, dosage_form, strength, evidence, source_id, created_at')
    .eq('ingredient_id', ingredientId)
    .order('edition', { ascending: false });
  if (error) {
    console.error('NEML membership lookup error:', error);
    return [];
  }
  return data ?? [];
}

/** Find interactions where both ingredients are among the medicines being checked. */
export async function getDrugInteractions(ingredientIds: string[]) {
  const ids = [...new Set(ingredientIds.filter(Boolean))];
  if (ids.length < 2) return [];

  const { data, error } = await supabase
    .from('drug_interactions')
    .select(`id, ingredient_a_id, ingredient_b_id, ingredient_a:ingredient_a_id (id, name, rxcui), ingredient_b:ingredient_b_id (id, name, rxcui)`)
    .in('ingredient_a_id', ids)
    .in('ingredient_b_id', ids);

  if (error) {
    console.error('Interaction lookup error:', error);
    return [];
  }

  const seen = new Set<string>();
  return (data ?? []).filter((row: any) => {
    const a = row.ingredient_a_id;
    const b = row.ingredient_b_id;
    if (!ids.includes(a) || !ids.includes(b) || a === b) return false;
    const key = [a, b].sort().join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** PubMed bibliographic evidence associated with the selected drug pairs. */
export async function getInteractionEvidence(ingredientIds: string[]) {
  const ids = [...new Set(ingredientIds.filter(Boolean))];
  if (ids.length < 2) return [];

  const { data, error } = await supabase
    .from('interaction_evidence')
    .select('id, interaction_id, ingredient_a_id, ingredient_b_id, pmid, title, journal, publication_year, source_id, source_url, retrieved_at')
    .in('ingredient_a_id', ids)
    .in('ingredient_b_id', ids)
    .order('publication_year', { ascending: false });

  if (error) {
    console.error('Interaction evidence lookup error:', error);
    return [];
  }

  const seen = new Set<string>();
  return (data ?? []).filter((row: any) => {
    const a = row.ingredient_a_id;
    const b = row.ingredient_b_id;
    if (!ids.includes(a) || !ids.includes(b) || a === b) return false;
    const pair = [a, b].sort().join(':');
    const key = `${pair}:${row.pmid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getAllIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id,name,rxcui,drug_class,mechanism_of_action,side_effects,contraindications,administration,food_interactions')
    .order('name');
  if (error) console.error('Ingredient lookup error:', error);
  return data ?? [];
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`id,name,rxcui,tty,source_id,source_updated_at,created_at,updated_at, product_ingredients (ingredient:ingredient_id (id, name, rxcui, drug_class))`)
    .order('name');
  if (error) console.error('Product listing error:', error);
  return data ?? [];
}

export async function getAllInteractions() {
  const { data, error } = await supabase
    .from('drug_interactions')
    .select(`id, ingredient_a_id, ingredient_b_id, ingredient_a:ingredient_a_id (id, name, rxcui), ingredient_b:ingredient_b_id (id, name, rxcui)`);
  if (error) console.error('Interaction listing error:', error);
  return data ?? [];
}

export async function saveScan(payload: {
  raw_ocr_text: string;
  extracted_medications: any;
  resolved_products: any;
  interaction_warnings: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('prescription_scans')
    .insert({ ...payload, user_id: user.id })
    .select();
  if (error) console.error('Save scan error:', error);
  return data;
}

export async function getScanHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('prescription_scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('Scan history error:', error);
  return data ?? [];
}
