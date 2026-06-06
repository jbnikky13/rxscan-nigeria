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
    .select('*, product:product_id(*)')
    .eq('ingredient_id', ingredientId);
  return data ?? [];
}

export async function checkInteractions(ingredientIds: string[]) {
  const { data } = await supabase
    .from('drug_interactions')
    .select(`
      *,
      ingredient_a:ingredient_a_id(name, rxcui),
      ingredient_b:ingredient_b_id(name, rxcui)
    `)
    .in('ingredient_a_id', ingredientIds)
    .in('ingredient_b_id', ingredientIds);

  return (data ?? []).filter(
    (row: any) =>
      ingredientIds.includes(row.ingredient_a_id) &&
      ingredientIds.includes(row.ingredient_b_id)
  );
}

export async function saveScan(payload: {
  image_url: string;
  raw_ocr_text: string;
  extracted_medications: any;
  resolved_products: any;
  interaction_warnings: any;
}) {
  const { data } = await supabase
    .from('prescription_scans')
    .insert(payload)
    .select();
  return data;
}
