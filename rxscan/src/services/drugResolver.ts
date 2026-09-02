import { supabase } from './supabaseClient';

export async function resolveDrugName(name: string) {
  const clean = name.trim();
  if (!clean) return [];

  const { data: aliasMatch, error: aliasError } = await supabase
    .from('drug_aliases')
    .select('*, ingredient:ingredient_id(*)')
    .ilike('alias', `%${clean}%`);

  if (aliasError) console.error('Alias lookup error:', aliasError);

  const { data: ingredientMatch, error: ingredientError } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('name', `%${clean}%`);

  if (ingredientError) console.error('Ingredient lookup error:', ingredientError);

  const ingredients = [
    ...(aliasMatch?.map((a: any) => a.ingredient).filter(Boolean) ?? []),
    ...(ingredientMatch ?? []),
  ];

  return ingredients.filter(
    (v: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === v.id) === i
  );
}

export async function getProductsByIngredient(ingredientId: string) {
  if (!ingredientId) return [];
  const { data, error } = await supabase
    .from('product_ingredient_map')
    .select(`*, product:product_id (id, brand_name, manufacturer, dosage_form, strength, route, nafdac_number, available_in_nigeria, nhis_covered, prescription_required, source_system, source_id, source_version, verified_at)`)
    .eq('ingredient_id', ingredientId);
  if (error) console.error('Product lookup error:', error);
  return data?.map((row: any) => row.product).filter(Boolean) ?? [];
}

/** National-list membership is evidence of inclusion in the named list, not blanket regulatory approval. */
export async function getMedicineListMemberships(ingredientId: string) {
  if (!ingredientId) return [];
  const { data, error } = await supabase
    .from('medicine_list_memberships')
    .select('id, list_name, country_code, edition, status, source_url, retrieved_at')
    .eq('ingredient_id', ingredientId)
    .order('edition', { ascending: false });
  if (error) console.error('Medicine-list lookup error:', error);
  return data ?? [];
}

export async function getDrugInteractions(ingredientIds: string[]) {
  const ids = [...new Set(ingredientIds.filter(Boolean))];
  if (ids.length < 2) return [];

  const { data, error } = await supabase
    .from('drug_interactions')
    .select(`*, ingredient_a:ingredient_a_id (id, name, rxcui), ingredient_b:ingredient_b_id (id, name, rxcui)`)
    .in('ingredient_a_id', ids)
    .in('ingredient_b_id', ids);

  if (error) {
    console.error('Interaction lookup error:', error);
    return [];
  }

  // De-duplicate reversed pairs defensively in case historical data contains both orientations.
  const seen = new Set<string>();
  return (data ?? []).filter((row: any) => {
    if (!ids.includes(row.ingredient_a_id) || !ids.includes(row.ingredient_b_id)) return false;
    const key = [row.ingredient_a_id, row.ingredient_b_id].sort().join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** PubMed bibliographic evidence associated with a drug pair. */
export async function getInteractionEvidence(ingredientIds: string[]) {
  const ids = [...new Set(ingredientIds.filter(Boolean))];
  if (ids.length < 2) return [];

  const { data, error } = await supabase
    .from('interaction_evidence')
    .select('id, ingredient_a_id, ingredient_b_id, pmid, title, journal, publication_year, source_url, retrieved_at')
    .in('ingredient_a_id', ids)
    .in('ingredient_b_id', ids)
    .order('publication_year', { ascending: false });

  if (error) {
    console.error('Interaction evidence lookup error:', error);
    return [];
  }

  const seen = new Set<string>();
  return (data ?? []).filter((row: any) => {
    if (!ids.includes(row.ingredient_a_id) || !ids.includes(row.ingredient_b_id)) return false;
    const pair = [row.ingredient_a_id, row.ingredient_b_id].sort().join(':');
    const key = `${pair}:${row.pmid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getAllIngredients() {
  const { data, error } = await supabase.from('ingredients').select('*').order('name');
  if (error) console.error('Ingredient lookup error:', error);
  return data ?? [];
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_ingredient_map (ingredient:ingredient_id (id, name, rxcui, drug_class))`)
    .order('brand_name');
  if (error) console.error('Product listing error:', error);
  return data ?? [];
}

export async function getAllInteractions() {
  const { data, error } = await supabase
    .from('drug_interactions')
    .select(`*, ingredient_a:ingredient_a_id (id, name, rxcui), ingredient_b:ingredient_b_id (id, name, rxcui)`);
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

  // Scan history is protected by RLS. Anonymous users can still scan; their
  // result remains in memory and is not persisted until they authenticate.
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
