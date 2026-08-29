import { supabase } from './supabaseClient';

export async function resolveDrugName(name: string) {
  const clean = name.trim();
  if (!clean) return [];

  const { data: aliasMatch } = await supabase
    .from('drug_aliases')
    .select('*, ingredient:ingredient_id(*)')
    .ilike('alias', `%${clean}%`);

  const { data: ingredientMatch } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('name', `%${clean}%`);

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
    .select(`*, product:product_id (id, brand_name, manufacturer, dosage_form, strength, route, nafdac_number, available_in_nigeria, nhis_covered, prescription_required)`)
    .eq('ingredient_id', ingredientId);
  if (error) console.error('Product lookup error:', error);
  return data?.map((row: any) => row.product).filter(Boolean) ?? [];
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

  return (data ?? []).filter((row: any) => ids.includes(row.ingredient_a_id) && ids.includes(row.ingredient_b_id));
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
  const { data, error } = await supabase.from('prescription_scans').insert(payload).select();
  if (error) console.error('Save scan error:', error);
  return data;
}

export async function getScanHistory() {
  const { data, error } = await supabase
    .from('prescription_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('Scan history error:', error);
  return data ?? [];
}
