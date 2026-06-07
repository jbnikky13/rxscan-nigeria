// @ts-nocheck
import { useState, useRef, useCallback } from "react";

// ─── MOCK DATABASE ────────────────────────────────────────────────────────────
const MOCK_DB = {
  ingredients: [
    {
      id: "ing-1", name: "Paracetamol", rxcui: "161",
      drug_class: "Analgesic / Antipyretic",
      mechanism_of_action: "Inhibits prostaglandin synthesis in the CNS, reducing fever and pain signals.",
      side_effects: ["Nausea", "Liver damage (overdose)", "Rash"],
      contraindications: ["Severe hepatic impairment", "Alcohol dependence"],
      administration: {
        timing: "Every 4–6 hours as needed",
        with_food: "Can be taken with or without food",
        max_dose: "Maximum 4g (4000mg) per day in adults",
        special: "Space doses at least 4 hours apart. Do not double dose.",
        missed_dose: "Take as soon as remembered unless it is almost time for the next dose.",
        storage: "Store below 30°C, away from moisture and sunlight."
      },
      food_interactions: [
        { food: "Alcohol", severity: "severe", effect: "Significantly increases risk of liver toxicity even at normal doses.", advice: "Avoid alcohol entirely while taking paracetamol." },
        { food: "High-fat meals", severity: "mild", effect: "May slightly delay absorption but does not affect overall efficacy.", advice: "No restriction needed — can be taken with meals." }
      ]
    },
    {
      id: "ing-2", name: "Amoxicillin", rxcui: "723",
      drug_class: "Antibiotic (Penicillin)",
      mechanism_of_action: "Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins.",
      side_effects: ["Diarrhoea", "Rash", "Nausea", "Vomiting"],
      contraindications: ["Penicillin allergy", "Mononucleosis"],
      administration: {
        timing: "Every 8 hours (three times daily) or every 12 hours depending on indication",
        with_food: "Can be taken with or without food. Taking with food reduces nausea.",
        max_dose: "500mg–1g per dose; up to 3g/day for most infections",
        special: "Complete the full course even if symptoms improve. Never skip doses.",
        missed_dose: "Take immediately. If nearly time for next dose, skip the missed one — never double up.",
        storage: "Store capsules below 25°C. Reconstituted suspension must be refrigerated and discarded after 7 days."
      },
      food_interactions: [
        { food: "Dairy products", severity: "mild", effect: "Dairy does not significantly affect amoxicillin absorption.", advice: "Can be taken with milk or dairy — no restriction." },
        { food: "Alcohol", severity: "mild", effect: "Alcohol does not directly inactivate amoxicillin but may worsen side effects and impair recovery.", advice: "Avoid or minimise alcohol during antibiotic treatment." }
      ]
    },
    {
      id: "ing-3", name: "Ibuprofen", rxcui: "5640",
      drug_class: "NSAID / Analgesic",
      mechanism_of_action: "Non-selective COX-1 and COX-2 inhibitor, reducing prostaglandin synthesis.",
      side_effects: ["GI bleeding", "Heartburn", "Dizziness", "Hypertension"],
      contraindications: ["Peptic ulcer", "Renal impairment", "3rd trimester pregnancy"],
      administration: {
        timing: "Every 6–8 hours as needed",
        with_food: "MUST be taken with food, milk, or antacids to reduce stomach irritation.",
        max_dose: "Maximum 1200mg/day OTC; up to 2400mg/day under medical supervision",
        special: "Use the lowest effective dose for the shortest duration. Do not lie down for 30 minutes after taking.",
        missed_dose: "Take with the next meal if missed. Do not double dose.",
        storage: "Store at room temperature, below 30°C."
      },
      food_interactions: [
        { food: "Alcohol", severity: "severe", effect: "Greatly increases risk of gastrointestinal bleeding and stomach ulcers.", advice: "Strictly avoid alcohol while taking ibuprofen." },
        { food: "Empty stomach / fasting", severity: "moderate", effect: "Taking ibuprofen on an empty stomach significantly increases GI irritation and ulcer risk.", advice: "Always take with food, milk, or a full glass of water." },
        { food: "High-sodium foods", severity: "mild", effect: "Excess sodium combined with NSAID use can worsen fluid retention and raise blood pressure.", advice: "Reduce salt intake during ibuprofen use, especially in hypertensive patients." }
      ]
    },
    {
      id: "ing-4", name: "Metformin", rxcui: "6809",
      drug_class: "Biguanide / Antidiabetic",
      mechanism_of_action: "Decreases hepatic glucose production and improves insulin sensitivity in peripheral tissues.",
      side_effects: ["Nausea", "Diarrhoea", "Lactic acidosis (rare)", "Vitamin B12 deficiency"],
      contraindications: ["Renal failure (eGFR <30)", "Hepatic failure", "Contrast media use"],
      administration: {
        timing: "Twice or three times daily with meals",
        with_food: "MUST be taken with meals to reduce GI side effects. Never take on an empty stomach.",
        max_dose: "Maximum 2550mg/day (in divided doses)",
        special: "Start at a low dose and increase gradually. Monitor blood glucose regularly. Withhold 48 hours before contrast dye procedures.",
        missed_dose: "Take with your next meal. Never take extra to make up for a missed dose.",
        storage: "Store at room temperature. Keep away from heat and moisture."
      },
      food_interactions: [
        { food: "Alcohol", severity: "severe", effect: "Alcohol increases the risk of lactic acidosis — a rare but life-threatening complication of metformin.", advice: "Avoid alcohol, especially binge drinking, during metformin therapy." },
        { food: "High-carbohydrate meals", severity: "mild", effect: "Very high-carb meals spike blood sugar. Metformin partially compensates but optimal control requires a balanced diet.", advice: "Follow a consistent low-glycaemic diet to optimise metformin effectiveness." },
        { food: "Vitamin B12-rich foods", severity: "info", effect: "Long-term metformin use reduces B12 absorption. Deficiency can cause peripheral neuropathy.", advice: "Include B12-rich foods (eggs, fish, dairy) or consider supplementation after 2+ years of use." }
      ]
    },
    {
      id: "ing-5", name: "Artemether", rxcui: "84368",
      drug_class: "Antimalarial (Artemisinin derivative)",
      mechanism_of_action: "Activated by haem to produce free radicals that damage malaria parasite membranes and proteins.",
      side_effects: ["Dizziness", "Nausea", "Headache", "QT prolongation"],
      contraindications: ["1st trimester pregnancy", "Severe neurological disease"],
      administration: {
        timing: "Twice daily for 3 days (standard Coartem regimen: 0, 8, 24, 36, 48, 60 hours)",
        with_food: "MUST be taken with food, preferably a fatty meal, to significantly increase absorption.",
        max_dose: "Per weight-based Coartem dosing chart",
        special: "If vomiting occurs within 1 hour of dose, repeat the dose. Complete all 6 doses even if feeling better.",
        missed_dose: "Take as soon as possible and continue the schedule. Incomplete treatment causes drug resistance.",
        storage: "Store below 30°C. Keep away from moisture."
      },
      food_interactions: [
        { food: "Fatty foods / full meal", severity: "info", effect: "A fatty meal (e.g. groundnuts, fried food, full milk) increases artemether/lumefantrine absorption by up to 3-fold.", advice: "Always take Coartem with a fatty meal or milk — this is clinically important, not optional." },
        { food: "Grapefruit juice", severity: "moderate", effect: "Grapefruit inhibits CYP3A4, potentially increasing artemether plasma levels unpredictably.", advice: "Avoid grapefruit juice during the treatment course." }
      ]
    },
    {
      id: "ing-6", name: "Lumefantrine", rxcui: "403987",
      drug_class: "Antimalarial",
      mechanism_of_action: "Interferes with haem detoxification in Plasmodium falciparum, causing toxic accumulation.",
      side_effects: ["Headache", "Dizziness", "Nausea", "Sleep disturbance"],
      contraindications: ["QT prolongation history", "Certain antifungal co-use"],
      administration: {
        timing: "Co-formulated with artemether in Coartem — same dosing schedule applies",
        with_food: "Requires fatty food for adequate absorption — critical for treatment success.",
        max_dose: "Per Coartem weight-based dosing",
        special: "Part of fixed-dose combination. Never split or use lumefantrine alone.",
        missed_dose: "As per Coartem instructions — resume schedule and complete all doses.",
        storage: "Store below 30°C, protect from moisture."
      },
      food_interactions: [
        { food: "Fatty foods / full meal", severity: "info", effect: "Bioavailability is dramatically improved with fat-containing food.", advice: "Mandatory: take with food containing fat (milk, groundnut butter, fried food)." },
        { food: "Grapefruit juice", severity: "moderate", effect: "Inhibits CYP3A4 metabolism of lumefantrine, potentially raising plasma levels.", advice: "Avoid grapefruit during treatment." }
      ]
    },
    {
      id: "ing-7", name: "Ciprofloxacin", rxcui: "2551",
      drug_class: "Fluoroquinolone Antibiotic",
      mechanism_of_action: "Inhibits bacterial DNA gyrase and topoisomerase IV, preventing DNA replication and repair.",
      side_effects: ["Nausea", "Diarrhoea", "Tendon rupture", "Photosensitivity", "Peripheral neuropathy"],
      contraindications: ["Children under 18", "Pregnancy", "Myasthenia gravis"],
      administration: {
        timing: "Every 12 hours (twice daily)",
        with_food: "Can be taken with or without food. Avoid taking with dairy or calcium-fortified foods within 2 hours.",
        max_dose: "500–750mg twice daily depending on indication; up to 1500mg/day",
        special: "Drink plenty of water. Avoid prolonged sun exposure — use sunscreen. Do not take with antacids, iron, or calcium supplements within 2 hours.",
        missed_dose: "Take as soon as remembered unless almost time for next dose. Complete the full course.",
        storage: "Store below 30°C, away from light."
      },
      food_interactions: [
        { food: "Dairy products / calcium-fortified foods", severity: "moderate", effect: "Calcium chelates ciprofloxacin, reducing absorption by up to 50%.", advice: "Avoid milk, yoghurt, cheese, and calcium-fortified drinks within 2 hours of each dose." },
        { food: "Caffeine (tea, coffee, energy drinks)", severity: "moderate", effect: "Ciprofloxacin inhibits CYP1A2, slowing caffeine metabolism — causes jitteriness, insomnia, palpitations.", advice: "Reduce or avoid caffeine during ciprofloxacin therapy." },
        { food: "Alcohol", severity: "mild", effect: "Increases risk of CNS side effects and impairs recovery.", advice: "Avoid alcohol during treatment." },
        { food: "Iron-rich foods / supplements", severity: "moderate", effect: "Iron chelates with ciprofloxacin and drastically reduces its absorption.", advice: "Take iron supplements or iron-rich foods at least 2 hours before or 6 hours after ciprofloxacin." }
      ]
    },
    {
      id: "ing-8", name: "Amlodipine", rxcui: "17767",
      drug_class: "Calcium Channel Blocker (Antihypertensive)",
      mechanism_of_action: "Blocks L-type voltage-gated calcium channels in vascular smooth muscle, causing vasodilation and reducing BP.",
      side_effects: ["Peripheral oedema", "Headache", "Flushing", "Palpitations", "Fatigue"],
      contraindications: ["Cardiogenic shock", "Severe aortic stenosis"],
      administration: {
        timing: "Once daily, at the same time each day",
        with_food: "Can be taken with or without food",
        max_dose: "Maximum 10mg once daily",
        special: "Do not stop suddenly — taper under medical supervision. Monitor BP regularly. Ankle swelling is common and usually benign.",
        missed_dose: "Take as soon as remembered on the same day. If the next day, skip and resume normal schedule — never double dose.",
        storage: "Store at room temperature, away from moisture and heat."
      },
      food_interactions: [
        { food: "Grapefruit / grapefruit juice", severity: "severe", effect: "Grapefruit inhibits CYP3A4, the enzyme that metabolises amlodipine — dramatically raises plasma levels, causing severe hypotension.", advice: "Strictly avoid grapefruit and grapefruit juice during amlodipine therapy." },
        { food: "Alcohol", severity: "moderate", effect: "Both alcohol and amlodipine lower blood pressure. Combined use risks severe hypotension and dizziness.", advice: "Minimise alcohol intake. Avoid on days of heavy physical activity or heat." },
        { food: "High-sodium / salty foods", severity: "moderate", effect: "Excess sodium causes fluid retention and counteracts the antihypertensive effect of amlodipine.", advice: "Follow a low-sodium diet to maximise blood pressure control." }
      ]
    },
  ],

  products: [
    { id: "prd-1", brand_name: "Emzor Paracetamol", manufacturer: "Emzor Pharmaceuticals", dosage_form: "Tablet", strength: "500mg", nafdac_number: "A4-0111", available_in_nigeria: true, nhis_covered: true, prescription_required: false, ingredient_ids: ["ing-1"] },
    { id: "prd-2", brand_name: "Panadol Extra", manufacturer: "GSK Nigeria", dosage_form: "Tablet", strength: "500mg + 65mg Caffeine", nafdac_number: "A4-2201", available_in_nigeria: true, nhis_covered: false, prescription_required: false, ingredient_ids: ["ing-1"] },
    { id: "prd-3", brand_name: "Amoxil", manufacturer: "GSK Nigeria", dosage_form: "Capsule", strength: "500mg", nafdac_number: "A4-0456", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-2"] },
    { id: "prd-4", brand_name: "Ampiclox", manufacturer: "Beecham", dosage_form: "Capsule", strength: "250mg + 250mg Cloxacillin", nafdac_number: "A4-0089", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-2"] },
    { id: "prd-5", brand_name: "Brufen", manufacturer: "Abbott", dosage_form: "Tablet", strength: "400mg", nafdac_number: "A4-0731", available_in_nigeria: true, nhis_covered: false, prescription_required: false, ingredient_ids: ["ing-3"] },
    { id: "prd-6", brand_name: "Glucophage", manufacturer: "Merck", dosage_form: "Tablet", strength: "500mg", nafdac_number: "A4-1120", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-4"] },
    { id: "prd-7", brand_name: "Coartem", manufacturer: "Novartis", dosage_form: "Tablet", strength: "20mg/120mg", nafdac_number: "A4-0920", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-5", "ing-6"] },
    { id: "prd-8", brand_name: "Ciprolet", manufacturer: "Dr. Reddy's", dosage_form: "Tablet", strength: "500mg", nafdac_number: "A4-1340", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-7"] },
    { id: "prd-9", brand_name: "Norvasc", manufacturer: "Pfizer", dosage_form: "Tablet", strength: "5mg", nafdac_number: "A4-0877", available_in_nigeria: true, nhis_covered: true, prescription_required: true, ingredient_ids: ["ing-8"] },
  ],

  drug_interactions: [
    { id: "ddi-1", ingredient_a_id: "ing-3", ingredient_b_id: "ing-4", severity: "moderate",
      description: "NSAIDs reduce renal prostaglandin synthesis, impairing metformin clearance and raising lactic acidosis risk.",
      mechanism: "Ibuprofen inhibits COX-mediated renal vasodilation, reducing GFR and metformin excretion.",
      clinical_effect: "Increased plasma metformin levels and elevated lactic acidosis risk.",
      onset: "Within hours to days of concurrent use.",
      management: "Monitor renal function and serum lactate. Avoid prolonged concurrent use. Use paracetamol for pain instead.",
      alternatives: "Replace ibuprofen with paracetamol for analgesia in diabetic patients." },
    { id: "ddi-2", ingredient_a_id: "ing-1", ingredient_b_id: "ing-3", severity: "mild",
      description: "Both paracetamol and ibuprofen are analgesics/antipyretics. Concurrent use adds GI and hepatic load.",
      mechanism: "Additive hepatotoxic potential (paracetamol) combined with GI mucosal damage (ibuprofen COX-1 inhibition).",
      clinical_effect: "Increased GI irritation and cumulative liver stress, especially with high doses.",
      onset: "Acute — present with each concurrent dose.",
      management: "Use alternating schedule: paracetamol and ibuprofen can be interleaved (one every 3 hours) rather than taken simultaneously.",
      alternatives: "Consider alternating dosing schedule for better pain control with reduced cumulative risk." },
    { id: "ddi-3", ingredient_a_id: "ing-5", ingredient_b_id: "ing-6", severity: "info",
      description: "Artemether and lumefantrine are co-formulated in Coartem. This is a deliberate synergistic therapeutic combination.",
      mechanism: "Artemether rapidly reduces parasite burden; lumefantrine clears residual parasites during its longer half-life.",
      clinical_effect: "Synergistic antimalarial action — each drug protects the other from resistance development.",
      onset: "Therapeutic — intended combination.",
      management: "No action needed. Ensure full 6-dose course is completed to prevent recrudescence.",
      alternatives: "This combination should not be replaced without prescriber guidance." },
    { id: "ddi-4", ingredient_a_id: "ing-7", ingredient_b_id: "ing-8", severity: "moderate",
      description: "Ciprofloxacin inhibits CYP1A2 and may mildly inhibit CYP3A4, potentially elevating amlodipine levels.",
      mechanism: "CYP3A4 inhibition by ciprofloxacin reduces first-pass metabolism of amlodipine, increasing bioavailability.",
      clinical_effect: "Enhanced hypotensive effect — risk of dizziness, fainting, peripheral oedema.",
      onset: "Within 2–3 days of starting concurrent therapy.",
      management: "Monitor blood pressure daily during co-administration. Advise patient to rise slowly from sitting/lying.",
      alternatives: "If prolonged antibiotic therapy is needed, discuss alternative antibiotic options with the prescriber." },
    { id: "ddi-5", ingredient_a_id: "ing-2", ingredient_b_id: "ing-7", severity: "mild",
      description: "Both amoxicillin and ciprofloxacin are antibiotics. Concurrent use is rarely indicated and risks disrupting gut flora.",
      mechanism: "Broad-spectrum coverage overlap — no direct pharmacokinetic interaction, but additive disruption of gut microbiome.",
      clinical_effect: "Severe diarrhoea, risk of C. difficile-associated colitis, antibiotic resistance selection.",
      onset: "Cumulative over days of concurrent use.",
      management: "Concurrent antibiotic use should only occur under specialist guidance. Monitor for severe diarrhoea.",
      alternatives: "Use one antibiotic appropriate to the identified pathogen whenever possible." },
  ],

  aliases: [
    { ingredient_id: "ing-1", alias: "Panadol", alias_type: "brand" },
    { ingredient_id: "ing-1", alias: "Tylenol", alias_type: "brand" },
    { ingredient_id: "ing-1", alias: "Acetaminophen", alias_type: "generic" },
    { ingredient_id: "ing-1", alias: "Emzor Para", alias_type: "brand" },
    { ingredient_id: "ing-2", alias: "Amoxil", alias_type: "brand" },
    { ingredient_id: "ing-2", alias: "Augmentin", alias_type: "brand" },
    { ingredient_id: "ing-2", alias: "Ampiclox", alias_type: "brand" },
    { ingredient_id: "ing-3", alias: "Advil", alias_type: "brand" },
    { ingredient_id: "ing-3", alias: "Brufen", alias_type: "brand" },
    { ingredient_id: "ing-4", alias: "Glucophage", alias_type: "brand" },
    { ingredient_id: "ing-5", alias: "Coartem", alias_type: "brand" },
    { ingredient_id: "ing-6", alias: "Coartem", alias_type: "brand" },
    { ingredient_id: "ing-7", alias: "Cipro", alias_type: "brand" },
    { ingredient_id: "ing-7", alias: "Ciprolet", alias_type: "brand" },
    { ingredient_id: "ing-8", alias: "Norvasc", alias_type: "brand" },
    { ingredient_id: "ing-8", alias: "Amlopin", alias_type: "brand" },
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function resolveDrugName(name) {
  const lower = name.toLowerCase();
  const fromAlias = MOCK_DB.aliases
    .filter((a) => a.alias.toLowerCase().includes(lower))
    .map((a) => MOCK_DB.ingredients.find((i) => i.id === a.ingredient_id))
    .filter(Boolean);
  const fromIngredient = MOCK_DB.ingredients.filter((i) =>
    i.name.toLowerCase().includes(lower)
  );
  const merged = [...fromAlias, ...fromIngredient];
  return merged.filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);
}

function getProductsByIngredient(id) {
  return MOCK_DB.products.filter((p) => p.ingredient_ids.includes(id));
}

function getDrugInteractions(ingredientIds) {
  return MOCK_DB.drug_interactions.filter(
    (i) => ingredientIds.includes(i.ingredient_a_id) && ingredientIds.includes(i.ingredient_b_id)
  );
}

async function callClaudeAPI(ocrText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a pharmacist assistant. Extract all medications from this prescription text.
Return ONLY valid JSON — no markdown, no preamble:
{"medications":[{"name":"drug name","dosage":"e.g.500mg","frequency":"e.g.twice daily","duration":"e.g.7 days","route":"e.g.oral"}],"prescriber":"or null","date":"or null","patient":"or null","notes":"or null"}
Text:\n${ocrText}`,
      }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const SEV = {
  severe:         { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: "🚨" },
  moderate:       { color: "#ea580c", bg: "#fff7ed", border: "#fdba74", icon: "⚠️" },
  mild:           { color: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: "⚡" },
  info:           { color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", icon: "ℹ️" },
  contraindicated:{ color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", icon: "🚫" },
};

const FOOD_SEV = {
  severe:   { color: "#dc2626", bg: "#fee2e2", label: "SEVERE" },
  moderate: { color: "#ea580c", bg: "#fff7ed", label: "MODERATE" },
  mild:     { color: "#d97706", bg: "#fef3c7", label: "MILD" },
  info:     { color: "#2563eb", bg: "#eff6ff", label: "NOTE" },
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Badge({ children, color = "#2563eb", bg = "#dbeafe" }) {
  return <span style={{ background: bg, color, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, ...style }}>{children}</div>;
}

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
      </div>
      {sub && <p style={{ margin: "4px 0 0 26px", fontSize: 12, color: "#6b7280" }}>{sub}</p>}
    </div>
  );
}

function Spinner({ msg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#eff6ff", borderRadius: 10, marginTop: 10 }}>
      <div style={{ width: 17, height: 17, border: "3px solid #bfdbfe", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#1d4ed8" }}>{msg}</span>
    </div>
  );
}

function ExpandToggle({ open, onToggle, label }) {
  return (
    <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#2563eb", fontWeight: 600, padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>
      {open ? "▲" : "▼"} {label}
    </button>
  );
}

// ─── ADMINISTRATION CARD ──────────────────────────────────────────────────────
function AdminCard({ ingredient, med }) {
  const [open, setOpen] = useState(false);
  const a = ingredient.administration;
  if (!a) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <ExpandToggle open={open} onToggle={() => setOpen(!open)} label="How to take this medication" />
      {open && (
        <div style={{ marginTop: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 10 }}>
            📋 Administration Guide — {ingredient.name} {med?.dosage ?? ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["⏰ Timing", a.timing],
              ["🍽️ With Food", a.with_food],
              ["📏 Max Dose", a.max_dose],
              ["💊 Missed Dose", a.missed_dose],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#14532d" }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>⚠️ Special Instructions</div>
            <div style={{ fontSize: 12, color: "#14532d" }}>{a.special}</div>
          </div>
          <div style={{ marginTop: 8, background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>📦 Storage</div>
            <div style={{ fontSize: 12, color: "#14532d" }}>{a.storage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FOOD INTERACTION CARD ────────────────────────────────────────────────────
function FoodInteractionCard({ ingredient }) {
  const [open, setOpen] = useState(false);
  const fi = ingredient.food_interactions;
  if (!fi || fi.length === 0) return null;
  const hasWarnings = fi.some((f) => f.severity === "severe" || f.severity === "moderate");
  return (
    <div style={{ marginTop: 6 }}>
      <ExpandToggle open={open} onToggle={() => setOpen(!open)}
        label={`Food & drink interactions (${fi.length})${hasWarnings ? " ⚠️" : ""}`} />
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {fi.map((f, i) => {
            const s = FOOD_SEV[f.severity] ?? FOOD_SEV.info;
            return (
              <div key={i} style={{ background: s.bg, border: `1px solid`, borderColor: SEV[f.severity]?.border ?? "#e5e7eb", borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>🍽️ {f.food}</div>
                  <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}`, borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 8px" }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 12, color: "#374151", margin: "0 0 6px" }}>{f.effect}</p>
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", fontWeight: 600 }}>
                  ✅ {f.advice}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DRUG-DRUG INTERACTION DETAIL ─────────────────────────────────────────────
function DDICard({ interaction }) {
  const [open, setOpen] = useState(true);
  const a = MOCK_DB.ingredients.find((x) => x.id === interaction.ingredient_a_id);
  const b = MOCK_DB.ingredients.find((x) => x.id === interaction.ingredient_b_id);
  const s = SEV[interaction.severity] ?? SEV.mild;
  return (
    <Card style={{ borderLeft: `4px solid ${s.color}`, background: s.bg, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
              {s.icon} {a?.name} <span style={{ color: "#9ca3af", fontWeight: 400 }}>+</span> {b?.name}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Drug–Drug Interaction</div>
          </div>
          <Badge color={s.color} bg="rgba(255,255,255,0.7)">{interaction.severity.toUpperCase()}</Badge>
        </div>
        <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{interaction.description}</p>
        <ExpandToggle open={open} onToggle={() => setOpen(!open)} label="Full details" />
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${s.border}`, padding: "14px 16px", background: "rgba(255,255,255,0.5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <InfoBox label="🔬 Mechanism" value={interaction.mechanism} />
            <InfoBox label="🩺 Clinical Effect" value={interaction.clinical_effect} />
            <InfoBox label="⏱️ Onset" value={interaction.onset} />
            <InfoBox label="💊 Alternatives" value={interaction.alternatives} />
          </div>
          <InfoBox label="✅ Management" value={interaction.management} highlight />
        </div>
      )}
    </Card>
  );
}

function InfoBox({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? "#f0fdf4" : "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px", border: highlight ? "1px solid #bbf7d0" : "none" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: highlight ? "#166534" : "#6b7280", marginBottom: 3, letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 12, color: highlight ? "#14532d" : "#374151", fontWeight: highlight ? 600 : 400 }}>{value}</div>
    </div>
  );
}

// ─── SCANNER TAB ──────────────────────────────────────────────────────────────
function ScannerTab({ onScanComplete }) {
  const [image, setImage] = useState(null);
  const [manualText, setManualText] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [mode, setMode] = useState("image");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setOcrText(""); setResult(null);
  };

  const runOCR = useCallback(async () => {
    setLoading(true); setLoadingMsg("Running OCR on prescription image…");
    await new Promise((r) => setTimeout(r, 1600));
    // In production: const result = await Tesseract.recognize(image, 'eng');
    setOcrText("Patient: Adaeze Okonkwo\nDate: 08/05/2026\nDr. B. Okafor\n\nRx:\n1. Panadol 500mg - 1 tab TDS x 5 days\n2. Amoxil 500mg cap - 1 BD x 7 days\n3. Brufen 400mg - 1 tab with food BD\n\nNote: Take full antibiotic course. Return if no improvement in 3 days.");
    setLoading(false); setLoadingMsg("");
  }, []);

  const process = async (text) => {
    setLoading(true); setLoadingMsg("AI extracting medications…");
    let extracted;
    try { extracted = await callClaudeAPI(text); }
    catch {
      extracted = {
        patient: "Adaeze Okonkwo", prescriber: "Dr. B. Okafor", date: "08/05/2026",
        notes: "Take full antibiotic course. Return if no improvement in 3 days.",
        medications: [
          { name: "Panadol",  dosage: "500mg", frequency: "Three times daily", duration: "5 days",    route: "oral" },
          { name: "Amoxil",   dosage: "500mg", frequency: "Twice daily",        duration: "7 days",    route: "oral" },
          { name: "Brufen",   dosage: "400mg", frequency: "Twice daily",        duration: "as needed", route: "oral" },
        ],
      };
    }

    setLoadingMsg("Resolving drugs via mapping table…");
    await new Promise((r) => setTimeout(r, 400));

    const resolved = extracted.medications.map((med) => {
      const ingredients = resolveDrugName(med.name);
      const ingredient = ingredients[0] ?? null;
      const products = ingredient ? getProductsByIngredient(ingredient.id) : [];
      return { ...med, ingredient, products };
    });

    const allIngIds = resolved.map((r) => r.ingredient?.id).filter(Boolean);
    const drug_interactions = getDrugInteractions(allIngIds);

    const final = { ...extracted, resolved, drug_interactions };
    setResult(final);
    onScanComplete(final);
    setLoading(false); setLoadingMsg("");
  };

  const activeText = mode === "manual" ? manualText : ocrText;

  // Count warnings for summary
  const severeCount = result?.drug_interactions?.filter(i => i.severity === "severe").length ?? 0;
  const moderateCount = result?.drug_interactions?.filter(i => i.severity === "moderate").length ?? 0;
  const foodWarnCount = result?.resolved?.reduce((acc, r) => acc + (r.ingredient?.food_interactions?.filter(f => f.severity === "severe" || f.severity === "moderate").length ?? 0), 0) ?? 0;

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["image", "📷 Upload Image"], ["manual", "⌨️ Type / Paste"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null); }}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: mode === m ? "#2563eb" : "#f3f4f6", color: mode === m ? "#fff" : "#374151" }}>
            {label}
          </button>
        ))}
      </div>

      {mode === "image" && (
        <>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: "#f9fafb", marginBottom: 12 }}>
            {image
              ? <img src={image} alt="rx" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }} />
              : <><div style={{ fontSize: 36 }}>📄</div><div style={{ color: "#6b7280", marginTop: 8, fontSize: 14 }}>Click to upload prescription image</div><div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>JPG, PNG, WEBP</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          {image && !ocrText && !loading && (
            <button onClick={runOCR} style={{ width: "100%", padding: 11, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 10 }}>
              Run OCR →
            </button>
          )}
          {ocrText && (
            <div style={{ marginTop: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4, letterSpacing: 0.4 }}>RAW OCR TEXT</div>
              <pre style={{ background: "#f3f4f6", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 110, overflow: "auto", margin: 0 }}>{ocrText}</pre>
            </div>
          )}
        </>
      )}

      {mode === "manual" && (
        <textarea value={manualText} onChange={(e) => setManualText(e.target.value)}
          placeholder={"Paste or type prescription here…\n\nExample:\nPatient: John Doe\nRx:\n  Panadol 500mg TDS x 5 days\n  Amoxil 500mg BD x 7 days\n  Brufen 400mg BD with food"}
          rows={7} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
      )}

      {loading && <Spinner msg={loadingMsg} />}

      {activeText.trim() && !loading && (
        <button onClick={() => process(activeText)}
          style={{ width: "100%", padding: 12, background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginTop: 12 }}>
          🧠 Analyse with AI & Check All Interactions →
        </button>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────────── */}
      {result && (
        <div style={{ marginTop: 26 }}>

          {/* Safety Summary Banner */}
          <div style={{ background: severeCount > 0 ? "#fef2f2" : moderateCount > 0 ? "#fff7ed" : "#f0fdf4",
            border: `1px solid ${severeCount > 0 ? "#fca5a5" : moderateCount > 0 ? "#fdba74" : "#bbf7d0"}`,
            borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 30 }}>{severeCount > 0 ? "🚨" : moderateCount > 0 ? "⚠️" : "✅"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: severeCount > 0 ? "#991b1b" : moderateCount > 0 ? "#9a3412" : "#166534" }}>
                {severeCount > 0 ? `${severeCount} Severe Interaction${severeCount > 1 ? "s" : ""} Detected`
                  : moderateCount > 0 ? `${moderateCount} Moderate Interaction${moderateCount > 1 ? "s" : ""} — Review Required`
                  : "No Critical Drug Interactions Detected"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {result.drug_interactions.length} drug–drug interaction(s) · {foodWarnCount} food/drink warning(s) across {result.resolved.length} medications
              </div>
            </div>
            {(severeCount > 0 || moderateCount > 0) && (
              <div style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
                Pharmacist Review Advised
              </div>
            )}
          </div>

          {/* Prescription meta */}
          <SectionHead icon="📋" title="Prescription" />
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
              {[["Patient", result.patient], ["Prescriber", result.prescriber], ["Date", result.date]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.5 }}>{l.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{v ?? "—"}</div>
                </div>
              ))}
            </div>
            {result.notes && <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>📝 {result.notes}</div>}
          </Card>

          {/* Resolved medications with admin + food interactions */}
          <SectionHead icon="💊" title="Medications" sub="Expand each card for administration guide and food/drink interactions" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {result.resolved.map((med, i) => (
              <Card key={i} style={{ borderLeft: `4px solid ${med.ingredient ? "#2563eb" : "#f59e0b"}` }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{med.dosage} · {med.frequency} · {med.duration} · {med.route}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {med.ingredient
                      ? <><Badge color="#059669" bg="#d1fae5">Resolved ✓</Badge><Badge color="#7c3aed" bg="#ede9fe">RxCUI: {med.ingredient.rxcui}</Badge></>
                      : <Badge color="#d97706" bg="#fef3c7">⚠ Not in DB</Badge>}
                  </div>
                </div>

                {med.ingredient && (
                  <>
                    {/* Ingredient info */}
                    <div style={{ background: "#f8faff", borderRadius: 9, padding: "9px 12px", marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#3730a3", letterSpacing: 0.5 }}>GENERIC — via Mapping Table</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{med.ingredient.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{med.ingredient.drug_class}</div>
                    </div>

                    {/* Nigerian products */}
                    {med.products.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5, marginBottom: 4 }}>AVAILABLE IN NIGERIA</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {med.products.map((p) => (
                            <div key={p.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", fontSize: 11 }}>
                              <span style={{ fontWeight: 600 }}>{p.brand_name}</span>
                              {p.nafdac_number && <span style={{ color: "#059669", marginLeft: 5 }}>NAFDAC ✓</span>}
                              {p.nhis_covered && <span style={{ color: "#2563eb", marginLeft: 5 }}>NHIS</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Administration guide */}
                    <AdminCard ingredient={med.ingredient} med={med} />

                    {/* Food interactions */}
                    <FoodInteractionCard ingredient={med.ingredient} />
                  </>
                )}
              </Card>
            ))}
          </div>

          {/* Drug-Drug Interactions */}
          <SectionHead icon="⚠️" title={`Drug–Drug Interactions (${result.drug_interactions.length})`}
            sub="Checked at ingredient level via mapping table — covers all brand/generic combinations" />
          {result.drug_interactions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {result.drug_interactions.map((inter) => <DDICard key={inter.id} interaction={inter} />)}
            </div>
          ) : (
            <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 24 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#166534", marginTop: 4 }}>No drug–drug interactions detected</div>
              <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>All medications in this prescription are safe to co-administer.</div>
            </Card>
          )}

          {/* Food Interaction Summary */}
          <SectionHead icon="🍽️" title="Food & Drink Interaction Summary"
            sub="Combined food warnings for all medications in this prescription" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.resolved.filter(r => r.ingredient?.food_interactions?.length > 0).map((med, i) => (
              <Card key={i}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#111827" }}>
                  💊 {med.ingredient.name} ({med.name}) — Food Interactions
                </div>
                {med.ingredient.food_interactions.map((f, j) => {
                  const s = FOOD_SEV[f.severity] ?? FOOD_SEV.info;
                  return (
                    <div key={j} style={{ background: s.bg, borderRadius: 10, padding: "10px 13px", marginBottom: 8, border: `1px solid ${SEV[f.severity]?.border ?? "#e5e7eb"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>🍽️ {f.food}</div>
                        <span style={{ color: s.color, fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "2px 8px" }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#374151", margin: "0 0 6px" }}>{f.effect}</p>
                      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", fontWeight: 600 }}>✅ {f.advice}</div>
                    </div>
                  );
                })}
              </Card>
            ))}
            {result.resolved.every(r => !r.ingredient?.food_interactions?.length) && (
              <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 24 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#166534", marginTop: 4, fontSize: 13 }}>No food interactions on record for these medications</div>
              </Card>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── DRUG LOOKUP TAB ──────────────────────────────────────────────────────────
function DrugLookupTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const search = () => { if (query.trim()) { setResults(resolveDrugName(query.trim())); setSelected(null); } };
  const products = selected ? getProductsByIngredient(selected.id) : [];

  return (
    <div>
      <SectionHead icon="🔍" title="Drug Lookup" sub="Search by brand name, generic name, or alias" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Panadol, Brufen, Glucophage, Coartem…"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }} />
        <button onClick={search} style={{ padding: "10px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Search</button>
      </div>

      {results.length === 0 && query && (
        <div style={{ textAlign: "center", padding: 28, color: "#6b7280" }}>
          <div style={{ fontSize: 30 }}>💊</div>
          <div style={{ marginTop: 6 }}>No results for "{query}"</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results.map((ing) => (
          <Card key={ing.id} style={{ cursor: "pointer", border: selected?.id === ing.id ? "2px solid #2563eb" : "1px solid #e5e7eb" }}>
            <div onClick={() => setSelected(selected?.id === ing.id ? null : ing)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{ing.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{ing.drug_class}</div>
                </div>
                <Badge color="#7c3aed" bg="#ede9fe">RxCUI: {ing.rxcui}</Badge>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{ing.mechanism_of_action}</p>
            </div>
            {selected?.id === ing.id && (
              <div style={{ marginTop: 14, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>SIDE EFFECTS</div>
                    {ing.side_effects.map((s) => <div key={s} style={{ fontSize: 12, color: "#374151", padding: "2px 0" }}>• {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>CONTRAINDICATIONS</div>
                    {ing.contraindications.map((c) => <div key={c} style={{ fontSize: 12, color: "#dc2626", padding: "2px 0" }}>⚠ {c}</div>)}
                  </div>
                </div>
                <AdminCard ingredient={ing} />
                <FoodInteractionCard ingredient={ing} />
                {products.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>NIGERIAN PRODUCTS</div>
                    {products.map((p) => (
                      <div key={p.id} style={{ background: "#f9fafb", borderRadius: 9, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.brand_name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{p.manufacturer} · {p.dosage_form} · {p.strength}</div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {p.nafdac_number && <Badge color="#059669" bg="#d1fae5">NAFDAC: {p.nafdac_number}</Badge>}
                          {p.nhis_covered && <Badge color="#2563eb" bg="#dbeafe">NHIS ✓</Badge>}
                          {p.prescription_required ? <Badge color="#dc2626" bg="#fee2e2">Rx</Badge> : <Badge color="#6b7280" bg="#f3f4f6">OTC</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── PRODUCTS TAB ─────────────────────────────────────────────────────────────
function ProductsTab() {
  const [filter, setFilter] = useState("");
  const filtered = MOCK_DB.products.filter((p) =>
    [p.brand_name, p.manufacturer, p.dosage_form].some((s) => s.toLowerCase().includes(filter.toLowerCase()))
  );
  return (
    <div>
      <SectionHead icon="📦" title="Product Registry" />
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter products…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p) => {
          const ings = p.ingredient_ids.map((id) => MOCK_DB.ingredients.find((i) => i.id === id)).filter(Boolean);
          return (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.brand_name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{p.manufacturer} · {p.dosage_form} · {p.strength}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {p.nafdac_number && <Badge color="#059669" bg="#d1fae5">NAFDAC: {p.nafdac_number}</Badge>}
                  {p.nhis_covered && <Badge color="#2563eb" bg="#dbeafe">NHIS ✓</Badge>}
                  {p.prescription_required ? <Badge color="#dc2626" bg="#fee2e2">Rx Required</Badge> : <Badge color="#6b7280" bg="#f3f4f6">OTC</Badge>}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 5 }}>ACTIVE INGREDIENTS — via Mapping Table</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ings.map((ing) => (
                  <div key={ing.id} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "4px 10px", fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{ing.name}</span>
                    <span style={{ color: "#7c3aed", marginLeft: 6 }}>RxCUI: {ing.rxcui}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── INTERACTIONS TAB ─────────────────────────────────────────────────────────
function InteractionsTab() {
  return (
    <div>
      <SectionHead icon="⚠️" title="Drug–Drug Interaction Reference" sub="Checked at ingredient level via mapping table" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {MOCK_DB.drug_interactions.map((inter) => <DDICard key={inter.id} interaction={inter} />)}
      </div>
      <SectionHead icon="🍽️" title="Food & Drug Interaction Reference" sub="Per-ingredient food/drink warnings" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {MOCK_DB.ingredients.filter(i => i.food_interactions?.length > 0).map((ing) => (
          <Card key={ing.id}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
              {ing.name} <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>— {ing.drug_class}</span>
            </div>
            {ing.food_interactions.map((f, i) => {
              const s = FOOD_SEV[f.severity] ?? FOOD_SEV.info;
              return (
                <div key={i} style={{ background: s.bg, borderRadius: 10, padding: "10px 13px", marginBottom: 8, border: `1px solid ${SEV[f.severity]?.border ?? "#e5e7eb"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🍽️ {f.food}</div>
                    <span style={{ color: s.color, fontSize: 10, fontWeight: 800 }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#374151", margin: "0 0 6px" }}>{f.effect}</p>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", fontWeight: 600 }}>✅ {f.advice}</div>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MAPPING TAB ──────────────────────────────────────────────────────────────
function MappingTab() {
  const rows = [];
  MOCK_DB.products.forEach((p) => {
    p.ingredient_ids.forEach((ingId) => {
      const ing = MOCK_DB.ingredients.find((i) => i.id === ingId);
      if (ing) rows.push({ product: p, ingredient: ing });
    });
  });
  return (
    <div>
      <SectionHead icon="🔗" title="Product → Ingredient Mapping Table" sub="Bridge table linking every product to its active ingredient and RxNorm CUI" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "#fff" }}>
              {["Brand Product", "Manufacturer", "Form", "Active Ingredient", "Drug Class", "RxCUI", "NAFDAC", "NHIS"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{row.product.brand_name}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{row.product.manufacturer}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{row.product.dosage_form}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0c4a6e", whiteSpace: "nowrap" }}>{row.ingredient.name}</td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>{row.ingredient.drug_class}</td>
                <td style={{ padding: "8px 12px" }}><Badge color="#7c3aed" bg="#ede9fe">{row.ingredient.rxcui}</Badge></td>
                <td style={{ padding: "8px 12px" }}>{row.product.nafdac_number ? <Badge color="#059669" bg="#d1fae5">{row.product.nafdac_number}</Badge> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                <td style={{ padding: "8px 12px" }}>{row.product.nhis_covered ? <Badge color="#2563eb" bg="#dbeafe">✓</Badge> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        {rows.length} mappings · {MOCK_DB.products.length} products · {MOCK_DB.ingredients.length} ingredients
      </div>
    </div>
  );
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
function HistoryTab({ history }) {
  if (!history.length) return (
    <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
      <div style={{ fontSize: 44 }}>📋</div>
      <div style={{ marginTop: 8, fontWeight: 600 }}>No scans yet</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Analyse a prescription to see it here</div>
    </div>
  );
  return (
    <div>
      <SectionHead icon="📋" title={`Scan History (${history.length})`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {history.map((scan, i) => {
          const sevCount = scan.drug_interactions?.filter(x => x.severity === "severe").length ?? 0;
          const modCount = scan.drug_interactions?.filter(x => x.severity === "moderate").length ?? 0;
          return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Patient: {scan.patient ?? "Unknown"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{scan.prescriber ?? "—"} · {scan.date ?? "—"}</div>
                </div>
                <Badge color={sevCount > 0 ? "#dc2626" : modCount > 0 ? "#ea580c" : "#059669"}
                  bg={sevCount > 0 ? "#fee2e2" : modCount > 0 ? "#fff7ed" : "#d1fae5"}>
                  {sevCount > 0 ? `${sevCount} severe` : modCount > 0 ? `${modCount} moderate` : "No interactions"}
                </Badge>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {scan.resolved?.map((med, j) => (
                  <div key={j} style={{ background: "#f3f4f6", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                    {med.name} {med.dosage}
                    {med.ingredient && <span style={{ color: "#7c3aed", marginLeft: 4 }}>({med.ingredient.name})</span>}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const TABS = [
  { label: "🔬 Scanner",      id: "scan" },
  { label: "💊 Drug Lookup",  id: "lookup" },
  { label: "📦 Products",     id: "products" },
  { label: "⚠️ Interactions", id: "interactions" },
  { label: "🔗 Mapping",      id: "mapping" },
  { label: "📋 History",      id: "history" },
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [history, setHistory] = useState([]);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f1f5f9", minHeight: "100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "18px 20px 0", color: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 10px", fontSize: 22 }}>💊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.5px" }}>RxScan Nigeria</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Prescription Scanner · Drug Interactions · Food Warnings · Administration Guides</div>
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto", gap: 0, scrollbarWidth: "none" }}>
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setTab(i)}
                style={{ padding: "10px 13px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  color: tab === i ? "#fff" : "rgba(255,255,255,0.55)",
                  borderBottom: tab === i ? "2px solid #fff" : "2px solid transparent",
                  fontWeight: tab === i ? 700 : 500, fontSize: 12, transition: "all 0.15s" }}>
                {t.label}
                {t.id === "history" && history.length > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 999, fontSize: 10, padding: "1px 5px", marginLeft: 5 }}>{history.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 52px" }}>
        {tab === 0 && <ScannerTab onScanComplete={(r) => setHistory((h) => [r, ...h])} />}
        {tab === 1 && <DrugLookupTab />}
        {tab === 2 && <ProductsTab />}
        {tab === 3 && <InteractionsTab />}
        {tab === 4 && <MappingTab />}
        {tab === 5 && <HistoryTab history={history} />}
      </div>
    </div>
  );
}