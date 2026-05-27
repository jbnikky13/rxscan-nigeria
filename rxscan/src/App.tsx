// @ts-nocheck
import { useState, useRef, useCallback } from "react";

const MOCK_DB = {
  ingredients: [
    { id: "ing-1", name: "Paracetamol", rxcui: "161", drug_class: "Analgesic / Antipyretic", mechanism_of_action: "Inhibits prostaglandin synthesis in the CNS, reducing fever and pain signals.", side_effects: ["Nausea", "Liver damage (overdose)", "Rash"], contraindications: ["Severe hepatic impairment", "Alcohol dependence"] },
    { id: "ing-2", name: "Amoxicillin", rxcui: "723", drug_class: "Antibiotic (Penicillin)", mechanism_of_action: "Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins.", side_effects: ["Diarrhoea", "Rash", "Nausea", "Vomiting"], contraindications: ["Penicillin allergy", "Mononucleosis"] },
    { id: "ing-3", name: "Ibuprofen", rxcui: "5640", drug_class: "NSAID / Analgesic", mechanism_of_action: "Non-selective COX-1 and COX-2 inhibitor, reducing prostaglandin synthesis.", side_effects: ["GI bleeding", "Heartburn", "Dizziness", "Hypertension"], contraindications: ["Peptic ulcer", "Renal impairment", "3rd trimester pregnancy"] },
    { id: "ing-4", name: "Metformin", rxcui: "6809", drug_class: "Biguanide / Antidiabetic", mechanism_of_action: "Decreases hepatic glucose production and improves insulin sensitivity.", side_effects: ["Nausea", "Diarrhoea", "Lactic acidosis (rare)", "Vitamin B12 deficiency"], contraindications: ["Renal failure", "Hepatic failure", "Contrast media use"] },
    { id: "ing-5", name: "Artemether", rxcui: "84368", drug_class: "Antimalarial", mechanism_of_action: "Activates by haem, producing free radicals that damage malaria parasite membranes.", side_effects: ["Dizziness", "Nausea", "Headache", "QT prolongation"], contraindications: ["1st trimester pregnancy", "Severe neurological disease"] },
    { id: "ing-6", name: "Lumefantrine", rxcui: "403987", drug_class: "Antimalarial", mechanism_of_action: "Interferes with heme detoxification in Plasmodium falciparum.", side_effects: ["Headache", "Dizziness", "Nausea", "Sleep disturbance"], contraindications: ["QT prolongation history", "Certain antifungal co-use"] },
    { id: "ing-7", name: "Ciprofloxacin", rxcui: "2551", drug_class: "Fluoroquinolone Antibiotic", mechanism_of_action: "Inhibits bacterial DNA gyrase and topoisomerase IV, blocking DNA replication.", side_effects: ["Nausea", "Diarrhoea", "Tendon rupture", "Photosensitivity"], contraindications: ["Children under 18 (growth plates)", "Pregnancy", "Myasthenia gravis"] },
    { id: "ing-8", name: "Amlodipine", rxcui: "17767", drug_class: "Calcium Channel Blocker", mechanism_of_action: "Blocks L-type calcium channels in vascular smooth muscle, causing vasodilation.", side_effects: ["Peripheral oedema", "Headache", "Flushing", "Palpitations"], contraindications: ["Cardiogenic shock", "Severe aortic stenosis"] },
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
  interactions: [
    { id: "int-1", ingredient_a_id: "ing-3", ingredient_b_id: "ing-4", severity: "moderate", description: "NSAIDs can reduce renal blood flow, impairing metformin clearance and increasing lactic acidosis risk.", clinical_effect: "Increased risk of lactic acidosis and renal impairment.", management: "Monitor renal function closely. Avoid prolonged concurrent use." },
    { id: "int-2", ingredient_a_id: "ing-1", ingredient_b_id: "ing-3", severity: "mild", description: "Both are analgesics. Concurrent use increases GI and hepatic load.", clinical_effect: "Additive risk of GI irritation and liver stress.", management: "Use alternating schedule if both required. Limit duration." },
    { id: "int-3", ingredient_a_id: "ing-5", ingredient_b_id: "ing-6", severity: "mild", description: "These are co-formulated in Coartem. The combination is intentional and therapeutic.", clinical_effect: "Combined antimalarial effect (synergistic).", management: "Therapeutic combination — no action needed." },
    { id: "int-4", ingredient_a_id: "ing-7", ingredient_b_id: "ing-8", severity: "moderate", description: "Ciprofloxacin can inhibit CYP1A2 enzymes, potentially elevating amlodipine plasma levels.", clinical_effect: "Enhanced hypotensive effect and risk of peripheral oedema.", management: "Monitor blood pressure closely during co-administration." },
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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function getProductsByIngredient(ingredientId) {
  return MOCK_DB.products.filter((p) => p.ingredient_ids.includes(ingredientId));
}

function getInteractions(ingredientIds) {
  return MOCK_DB.interactions.filter(
    (i) =>
      ingredientIds.includes(i.ingredient_a_id) &&
      ingredientIds.includes(i.ingredient_b_id)
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
        content: `You are a pharmacist assistant. Extract all medications from this handwritten prescription OCR text.
Return ONLY valid JSON — no markdown, no explanation:
{
  "medications": [{"name":"drug name","dosage":"e.g. 500mg","frequency":"e.g. twice daily","duration":"e.g. 7 days","route":"e.g. oral"}],
  "prescriber": "doctor name or null",
  "date": "date or null",
  "patient": "patient name or null",
  "notes": "any other notes or null"
}
OCR Text:\n${ocrText}`,
      }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Style tokens ─────────────────────────────────────────────────────────────
const sevColor = { mild: "#d97706", moderate: "#ea580c", severe: "#dc2626", contraindicated: "#7c3aed" };
const sevBg    = { mild: "#fef3c7", moderate: "#fff7ed", severe: "#fee2e2", contraindicated: "#ede9fe" };

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function Badge({ children, color = "#2563eb", bg = "#dbeafe", style = {} }) {
  return (
    <span style={{ background: bg, color, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, ...style }}>
      {children}
    </div>
  );
}

function SectionHead({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 19 }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h2>
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

// ── Tab: Scanner ──────────────────────────────────────────────────────────────
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
    // Simulated OCR — replace with Tesseract.recognize(image,'eng') in production
    setOcrText("Patient: Adaeze Okonkwo\nDate: 08/05/2026\nDr. B. Okafor\n\nRx:\n1. Panadol 500mg - 1 tab TDS x 5 days\n2. Amoxil 500mg cap - 1 BD x 7 days\n3. Brufen 400mg - 1 tab with food BD\n\nNote: Take full antibiotic course.");
    setLoading(false); setLoadingMsg("");
  }, [image]);

  const process = async (text) => {
    setLoading(true); setLoadingMsg("Extracting medications with AI…");
    let extracted;
    try { extracted = await callClaudeAPI(text); }
    catch {
      extracted = {
        patient: "Adaeze Okonkwo", prescriber: "Dr. B. Okafor", date: "08/05/2026",
        notes: "Take full antibiotic course.",
        medications: [
          { name: "Panadol",  dosage: "500mg", frequency: "Three times daily", duration: "5 days", route: "oral" },
          { name: "Amoxil",   dosage: "500mg", frequency: "Twice daily",        duration: "7 days", route: "oral" },
          { name: "Brufen",   dosage: "400mg", frequency: "Twice daily",        duration: "as needed", route: "oral" },
        ],
      };
    }

    setLoadingMsg("Resolving via mapping table…");
    await new Promise((r) => setTimeout(r, 500));

    const resolved = extracted.medications.map((med) => {
      const ingredients = resolveDrugName(med.name);
      const ingredient = ingredients[0] ?? null;
      const products = ingredient ? getProductsByIngredient(ingredient.id) : [];
      return { ...med, ingredient, products };
    });

    const allIngIds = resolved.map((r) => r.ingredient?.id).filter(Boolean);
    const interactions = getInteractions(allIngIds);
    const final = { ...extracted, resolved, interactions };
    setResult(final);
    onScanComplete(final);
    setLoading(false); setLoadingMsg("");
  };

  const activeText = mode === "manual" ? manualText : ocrText;
  const canProcess = activeText.trim().length > 0 && !loading;

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
              ? <img src={image} alt="rx" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8 }} />
              : <><div style={{ fontSize: 40 }}>📄</div><div style={{ color: "#6b7280", marginTop: 8 }}>Click to upload prescription image</div><div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>JPG, PNG, WEBP</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          {image && !ocrText && !loading && (
            <button onClick={runOCR} style={{ width: "100%", padding: 11, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 10 }}>
              Run OCR →
            </button>
          )}
          {ocrText && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>RAW OCR TEXT</div>
              <pre style={{ background: "#f3f4f6", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto", margin: 0 }}>{ocrText}</pre>
            </div>
          )}
        </>
      )}

      {mode === "manual" && (
        <textarea value={manualText} onChange={(e) => setManualText(e.target.value)}
          placeholder={"Type or paste prescription text here…\n\nExample:\nPatient: John Doe\nRx:\n  Panadol 500mg TDS x 5 days\n  Amoxil 500mg BD x 7 days\n  Glucophage 500mg OD"}
          rows={7} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
      )}

      {loading && <Spinner msg={loadingMsg} />}

      {canProcess && (
        <button onClick={() => process(activeText)} disabled={loading}
          style={{ width: "100%", padding: 12, background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginTop: 12 }}>
          🧠 Analyse with AI & Resolve Drugs →
        </button>
      )}

      {/* Results */}
      {result && (
        <div style={{ marginTop: 24 }}>
          {/* Prescription meta */}
          <SectionHead icon="📋" title="Prescription Details" />
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
              {[["Patient", result.patient], ["Prescriber", result.prescriber], ["Date", result.date]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.5 }}>{l.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{v ?? "—"}</div>
                </div>
              ))}
            </div>
            {result.notes && <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>📝 {result.notes}</div>}
          </Card>

          {/* Resolved medications */}
          <SectionHead icon="💊" title="Resolved Medications" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {result.resolved.map((med, i) => (
              <Card key={i} style={{ borderLeft: `4px solid ${med.ingredient ? "#059669" : "#f59e0b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{med.dosage} · {med.frequency} · {med.duration}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {med.ingredient
                      ? <><Badge color="#059669" bg="#d1fae5">Resolved ✓</Badge><Badge color="#7c3aed" bg="#ede9fe">RxCUI: {med.ingredient.rxcui}</Badge></>
                      : <Badge color="#d97706" bg="#fef3c7">⚠ Not in DB</Badge>}
                  </div>
                </div>
                {med.ingredient && (
                  <>
                    <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#0369a1", letterSpacing: 0.5 }}>GENERIC — via MAPPING TABLE</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0c4a6e" }}>{med.ingredient.name}</div>
                      <div style={{ fontSize: 11, color: "#0369a1" }}>{med.ingredient.drug_class}</div>
                    </div>
                    {med.products.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5, marginBottom: 4 }}>AVAILABLE IN NIGERIA</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {med.products.map((p) => (
                            <div key={p.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", fontSize: 11 }}>
                              <span style={{ fontWeight: 600 }}>{p.brand_name}</span>
                              {p.nafdac_number && <span style={{ color: "#059669", marginLeft: 6 }}>NAFDAC ✓</span>}
                              {p.nhis_covered && <span style={{ color: "#2563eb", marginLeft: 6 }}>NHIS</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>

          {/* Interactions */}
          <SectionHead icon="🚨" title={result.interactions.length > 0 ? `Interaction Warnings (${result.interactions.length})` : "Interaction Check"} />
          {result.interactions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.interactions.map((inter, i) => {
                const a = MOCK_DB.ingredients.find((x) => x.id === inter.ingredient_a_id);
                const b = MOCK_DB.ingredients.find((x) => x.id === inter.ingredient_b_id);
                return (
                  <Card key={i} style={{ borderLeft: `4px solid ${sevColor[inter.severity]}`, background: sevBg[inter.severity] }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{a?.name} <span style={{ color: "#9ca3af" }}>+</span> {b?.name}</div>
                      <Badge color={sevColor[inter.severity]} bg="#fff">{inter.severity.toUpperCase()}</Badge>
                    </div>
                    <p style={{ fontSize: 13, margin: "0 0 8px", color: "#374151" }}>{inter.description}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "7px 10px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 2 }}>CLINICAL EFFECT</div>
                        <div style={{ fontSize: 12, color: "#78350f" }}>{inter.clinical_effect}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "7px 10px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 2 }}>MANAGEMENT</div>
                        <div style={{ fontSize: 12, color: "#14532d" }}>{inter.management}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#166534", marginTop: 4 }}>No interactions detected</div>
              <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>All medications are safe to co-administer.</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Drug Lookup ──────────────────────────────────────────────────────────
function DrugLookupTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const search = () => {
    if (!query.trim()) return;
    setResults(resolveDrugName(query.trim()));
    setSelected(null);
  };

  const products = selected ? getProductsByIngredient(selected.id) : [];

  return (
    <div>
      <SectionHead icon="🔍" title="Search Drug Database" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Brand, generic, or alias… e.g. Panadol, Cipro"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }} />
        <button onClick={search}
          style={{ padding: "10px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
          Search
        </button>
      </div>

      {results.length === 0 && query && (
        <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
          <div style={{ fontSize: 32 }}>💊</div>
          <div style={{ marginTop: 8 }}>No results for "{query}"</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results.map((ing) => (
          <Card key={ing.id} style={{ cursor: "pointer", border: selected?.id === ing.id ? "2px solid #2563eb" : "1px solid #e5e7eb" }}>
            <div onClick={() => setSelected(selected?.id === ing.id ? null : ing)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{ing.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{ing.drug_class}</div>
                </div>
                <Badge color="#7c3aed" bg="#ede9fe">RxCUI: {ing.rxcui}</Badge>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{ing.mechanism_of_action}</p>
            </div>

            {selected?.id === ing.id && (
              <div style={{ marginTop: 14, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, letterSpacing: 0.5 }}>SIDE EFFECTS</div>
                    {ing.side_effects.map((s) => <div key={s} style={{ fontSize: 12, color: "#374151", padding: "2px 0" }}>• {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, letterSpacing: 0.5 }}>CONTRAINDICATIONS</div>
                    {ing.contraindications.map((c) => <div key={c} style={{ fontSize: 12, color: "#dc2626", padding: "2px 0" }}>⚠ {c}</div>)}
                  </div>
                </div>

                {products.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 6, letterSpacing: 0.5 }}>NIGERIAN PRODUCTS ({products.length}) — via Mapping Table</div>
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
                  </>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Products ─────────────────────────────────────────────────────────────
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
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 5, letterSpacing: 0.5 }}>ACTIVE INGREDIENTS — via Mapping Table</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ings.map((ing) => (
                    <div key={ing.id} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "4px 10px", fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{ing.name}</span>
                      <span style={{ color: "#7c3aed", marginLeft: 6 }}>RxCUI: {ing.rxcui}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Interactions ─────────────────────────────────────────────────────────
function InteractionsTab() {
  return (
    <div>
      <SectionHead icon="⚠️" title="Known Drug Interactions" />
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14, background: "#f9fafb", borderRadius: 10, padding: "10px 14px" }}>
        Interactions are checked at the <strong>ingredient level</strong> via the mapping table — not the brand level.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MOCK_DB.interactions.map((inter) => {
          const a = MOCK_DB.ingredients.find((i) => i.id === inter.ingredient_a_id);
          const b = MOCK_DB.ingredients.find((i) => i.id === inter.ingredient_b_id);
          return (
            <Card key={inter.id} style={{ borderLeft: `4px solid ${sevColor[inter.severity]}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                  {a?.name} <span style={{ color: "#9ca3af" }}>+</span> {b?.name}
                </div>
                <Badge color={sevColor[inter.severity]} bg={sevBg[inter.severity]}>{inter.severity.toUpperCase()}</Badge>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 10px" }}>{inter.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#fef9ee", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 2 }}>CLINICAL EFFECT</div>
                  <div style={{ fontSize: 12, color: "#78350f" }}>{inter.clinical_effect}</div>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 2 }}>MANAGEMENT</div>
                  <div style={{ fontSize: 12, color: "#14532d" }}>{inter.management}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Mapping Table ────────────────────────────────────────────────────────
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
      <SectionHead icon="🔗" title="Product → Ingredient Mapping Table" />
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px" }}>
        This is the <strong>bridge table</strong> that links every Product to its active Ingredient and RxNorm CUI. Combo drugs (e.g. Coartem) appear as multiple rows.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "#fff" }}>
              {["Brand Product", "Manufacturer", "Form", "Active Ingredient", "Drug Class", "RxCUI", "NAFDAC", "NHIS"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, letterSpacing: 0.4, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{row.product.brand_name}</td>
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
      <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        {rows.length} mappings across {MOCK_DB.products.length} products and {MOCK_DB.ingredients.length} ingredients
      </div>
    </div>
  );
}

// ── Tab: History ──────────────────────────────────────────────────────────────
function HistoryTab({ history }) {
  if (!history.length)
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
        <div style={{ fontSize: 48 }}>📋</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>No scans yet</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Analyse a prescription to see it here</div>
      </div>
    );

  return (
    <div>
      <SectionHead icon="📋" title={`Scan History (${history.length})`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {history.map((scan, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Patient: {scan.patient ?? "Unknown"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {scan.prescriber ?? "Unknown prescriber"} · {scan.date ?? "No date"}
                </div>
              </div>
              <Badge
                color={scan.interactions?.length > 0 ? "#dc2626" : "#059669"}
                bg={scan.interactions?.length > 0 ? "#fee2e2" : "#d1fae5"}>
                {scan.interactions?.length > 0 ? `${scan.interactions.length} interaction(s)` : "No interactions"}
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
        ))}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
const TABS = [
  { label: "🔬 Scanner",     id: "scan" },
  { label: "💊 Drug Lookup", id: "lookup" },
  { label: "📦 Products",    id: "products" },
  { label: "⚠️ Interactions",id: "interactions" },
  { label: "🔗 Mapping",     id: "mapping" },
  { label: "📋 History",     id: "history" },
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [history, setHistory] = useState([]);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f1f5f9", minHeight: "100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "18px 20px 0", color: "#fff" }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 10px", fontSize: 22 }}>💊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.5px" }}>RxScan Nigeria</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Prescription Scanner + MedInfo System with RxNorm Mapping</div>
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto", paddingBottom: 0, gap: 0, scrollbarWidth: "none" }}>
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setTab(i)}
                style={{ padding: "10px 13px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  color: tab === i ? "#fff" : "rgba(255,255,255,0.55)",
                  borderBottom: tab === i ? "2px solid #fff" : "2px solid transparent",
                  fontWeight: tab === i ? 700 : 500, fontSize: 12, transition: "all 0.15s" }}>
                {t.label}
                {t.id === "history" && history.length > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 999, fontSize: 10, padding: "1px 5px", marginLeft: 5 }}>
                    {history.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "22px 16px 48px" }}>
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