import { supabase } from './supabaseClient';

export async function resolveDrugName(name: string) {
  const { data: aliasMatch } = await supabase
    .from('drug_aliases')
    .select('*, ingredient:ingredient_id(*)')
    .ilike('alias', `%${name}%`);

  const { data: ingredientMatch } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('name', `%${name}%`);

  const ingredients = [
    ...(aliasMatch?.map((a: any) => a.ingredient) ?? []),
    ...(ingredientMatch ?? []),
  ];

  return ingredients.filter(
    (v: any, i: number, arr: any[]) =>
      arr.findIndex((x: any) => x.id === v.id) === i
  );
}

export async function getProductsByIngredient(ingredientId: string) {
  const { data } = await supabase
    .from('product_ingredient_map')
    .select(`
      *,
      product:product_id (
        id, brand_name, manufacturer,
        dosage_form, strength, route,
        nafdac_number, available_in_nigeria,
        nhis_covered, prescription_required
      )
    `)
    .eq('ingredient_id', ingredientId);
  return data?.map((row: any) => row.product) ?? [];
}

export async function getDrugInteractions(ingredientIds: string[]) {
  const { data } = await supabase
    .from('drug_interactions')
    .select(`
      *,
      ingredient_a:ingredient_a_id (id, name, rxcui),
      ingredient_b:ingredient_b_id (id, name, rxcui)
    `)
    .in('ingredient_a_id', ingredientIds)
    .in('ingredient_b_id', ingredientIds);

  return (data ?? []).filter(
    (row: any) =>
      ingredientIds.includes(row.ingredient_a_id) &&
      ingredientIds.includes(row.ingredient_b_id)
  );
}

export async function getAllIngredients() {
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');
  return data ?? [];
}

export async function getAllProducts() {
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_ingredient_map (
        ingredient:ingredient_id (id, name, rxcui, drug_class)
      )
    `)
    .order('brand_name');
  return data ?? [];
}

export async function getAllInteractions() {
  const { data } = await supabase
    .from('drug_interactions')
    .select(`
      *,
      ingredient_a:ingredient_a_id (id, name, rxcui),
      ingredient_b:ingredient_b_id (id, name, rxcui)
    `);
  return data ?? [];
}

export async function saveScan(payload: {
  raw_ocr_text: string;
  extracted_medications: any;
  resolved_products: any;
  interaction_warnings: any;
}) {
  const { data, error } = await supabase
    .from('prescription_scans')
    .insert(payload)
    .select();
  if (error) console.error('Save scan error:', error);
  return data;
}

export async function getScanHistory() {
  const { data } = await supabase
    .from('prescription_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}
