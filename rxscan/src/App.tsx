// @ts-nocheck
import { useState, useRef, useCallback } from "react";
import Tesseract from "tesseract.js";
import { resolveDrugName, getProductsByIngredient, getDrugInteractions, saveScan } from "./services/drugResolver";
import { callClaudeAPI } from "./services/claudeAPI";

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const SEV = {
  severe:          { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: "🚨" },
  moderate:        { color: "#ea580c", bg: "#fff7ed", border: "#fdba74", icon: "⚠️" },
  mild:            { color: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: "⚡" },
  info:            { color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", icon: "ℹ️" },
  contraindicated: { color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", icon: "🚫" },
};

const FOOD_SEV = {
  severe:   { color: "#dc2626", bg: "#fee2e2", label: "SEVERE" },
  moderate: { color: "#ea580c", bg: "#fff7ed", label: "MODERATE" },
  mild:     { color: "#d97706", bg: "#fef3c7", label: "MILD" },
  info:     { color: "#2563eb", bg: "#eff6ff", label: "NOTE" },
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Badge({ children, color = "#2563eb", bg = "#dbeafe" }) {
  return (
    <span style={{ background: bg, color, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px", whiteSpace: "nowrap" }}>
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

function InfoBox({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? "#f0fdf4" : "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px", border: highlight ? "1px solid #bbf7d0" : "none" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: highlight ? "#166534" : "#6b7280", marginBottom: 3, letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 12, color: highlight ? "#14532d" : "#374151", fontWeight: highlight ? 600 : 400 }}>{value}</div>
    </div>
  );
}

// ─── ADMINISTRATION CARD ──────────────────────────────────────────────────────
function AdminCard({ ingredient, med }) {
  const [open, setOpen] = useState(false);
  const a = ingredient?.administration;
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
            ].map(([label, val]) => val ? (
              <div key={label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#14532d" }}>{val}</div>
              </div>
            ) : null)}
          </div>
          {a.special && (
            <div style={{ marginTop: 10, background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>⚠️ Special Instructions</div>
              <div style={{ fontSize: 12, color: "#14532d" }}>{a.special}</div>
            </div>
          )}
          {a.storage && (
            <div style={{ marginTop: 8, background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "8px 11px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 3 }}>📦 Storage</div>
              <div style={{ fontSize: 12, color: "#14532d" }}>{a.storage}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FOOD INTERACTION CARD ─────────────────────────────────────────────────────
function FoodInteractionCard({ ingredient }) {
  const [open, setOpen] = useState(false);
  const fi = ingredient?.food_interactions;
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
              <div key={i} style={{ background: s.bg, border: `1px solid ${SEV[f.severity]?.border ?? "#e5e7eb"}`, borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>🍽️ {f.food}</div>
                  <span style={{ color: s.color, fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "2px 8px" }}>{s.label}</span>
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

// ─── DDI CARD ──────────────────────────────────────────────────────────────────
function DDICard({ interaction }) {
  const [open, setOpen] = useState(true);
  const a = interaction.ingredient_a;
  const b = interaction.ingredient_b;
  const s = SEV[interaction.severity] ?? SEV.mild;
  return (
    <Card style={{ borderLeft: `4px solid ${s.color}`, background: s.bg, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
              {s.icon} {a?.name ?? "Drug A"} <span style={{ color: "#9ca3af", fontWeight: 400 }}>+</span> {b?.name ?? "Drug B"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Drug–Drug Interaction</div>
          </div>
          <Badge color={s.color} bg="rgba(255,255,255,0.7)">{interaction.severity?.toUpperCase()}</Badge>
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
    setOcrText("");
    setResult(null);
  };

  // ── REAL TESSERACT OCR ─────────────────────────────────────────────────────
  const runOCR = useCallback(async () => {
    if (!image) return;
    setLoading(true);
    setLoadingMsg("Running OCR on prescription image…");
    try {
      const result = await Tesseract.recognize(image, "eng", {
        logger: (m) => console.log(m),
      });
      setOcrText(result.data.text);
    } catch (err) {
      setLoadingMsg("OCR failed. Please try typing the prescription manually.");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }, [image]);

  // ── PROCESS TEXT THROUGH CLAUDE + SUPABASE ────────────────────────────────
  const process = async (text) => {
    setLoading(true);
    setLoadingMsg("AI extracting medications…");
    let extracted;
    try {
      extracted = await callClaudeAPI(text);
    } catch (err) {
      console.error("Claude API error:", err);
      extracted = {
        patient: null, prescriber: null, date: null, notes: null,
        medications: [],
      };
    }

    setLoadingMsg("Resolving drugs via mapping table…");

    const resolved = await Promise.all(
      (extracted.medications ?? []).map(async (med) => {
        const ingredients = await resolveDrugName(med.name);
        const ingredient = ingredients[0] ?? null;
        const products = ingredient
          ? await getProductsByIngredient(ingredient.id)
          : [];
        return { ...med, ingredient, products };
      })
    );

    setLoadingMsg("Checking drug interactions…");

    const allIngIds = resolved.map((r) => r.ingredient?.id).filter(Boolean);
    const drug_interactions = allIngIds.length > 1
      ? await getDrugInteractions(allIngIds)
      : [];

    const final = { ...extracted, resolved, drug_interactions };

    // Save scan to Supabase history
    try {
      await saveScan({
        raw_ocr_text: text,
        extracted_medications: extracted.medications,
        resolved_products: resolved,
        interaction_warnings: drug_interactions,
      });
    } catch (err) {
      console.error("Failed to save scan:", err);
    }

    setResult(final);
    onScanComplete(final);
    setLoading(false);
    setLoadingMsg("");
  };

  const activeText = mode === "manual" ? manualText : ocrText;
  const severeCount = result?.drug_interactions?.filter((i) => i.severity === "severe").length ?? 0;
  const moderateCount = result?.drug_interactions?.filter((i) => i.severity === "moderate").length ?? 0;
  const foodWarnCount = result?.resolved?.reduce(
    (acc, r) => acc + (r.ingredient?.food_interactions?.filter(
      (f) => f.severity === "severe" || f.severity === "moderate"
    ).length ?? 0), 0
  ) ?? 0;

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["image", "📷 Upload Image"], ["manual", "⌨️ Type / Paste"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null); }}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: mode === m ? "#2563eb" : "#f3f4f6",
              color: mode === m ? "#fff" : "#374151" }}>
            {label}
          </button>
        ))}
      </div>

      {mode === "image" && (
        <>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: "#f9fafb", marginBottom: 12 }}>
            {image
              ? <img src={image} alt="prescription" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }} />
              : <>
                  <div style={{ fontSize: 36 }}>📄</div>
                  <div style={{ color: "#6b7280", marginTop: 8, fontSize: 14 }}>Click to upload prescription image</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>JPG, PNG, WEBP</div>
                </>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

          {image && !ocrText && !loading && (
            <button onClick={runOCR}
              style={{ width: "100%", padding: 11, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 10 }}>
              Run OCR →
            </button>
          )}

          {ocrText && (
            <div style={{ marginTop: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4, letterSpacing: 0.4 }}>RAW OCR TEXT</div>
              <pre style={{ background: "#f3f4f6", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto", margin: 0 }}>
                {ocrText}
              </pre>
            </div>
          )}
        </>
      )}

      {mode === "manual" && (
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder={"Paste or type prescription here…\n\nExample:\nPatient: John Doe\nRx:\n  Panadol 500mg TDS x 5 days\n  Amoxil 500mg BD x 7 days\n  Brufen 400mg BD with food"}
          rows={7}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
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
          <div style={{
            background: severeCount > 0 ? "#fef2f2" : moderateCount > 0 ? "#fff7ed" : "#f0fdf4",
            border: `1px solid ${severeCount > 0 ? "#fca5a5" : moderateCount > 0 ? "#fdba74" : "#bbf7d0"}`,
            borderRadius: 12, padding: "14px 18px", marginBottom: 20,
            display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap"
          }}>
            <div style={{ fontSize: 30 }}>
              {severeCount > 0 ? "🚨" : moderateCount > 0 ? "⚠️" : "✅"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: severeCount > 0 ? "#991b1b" : moderateCount > 0 ? "#9a3412" : "#166534" }}>
                {severeCount > 0
                  ? `${severeCount} Severe Interaction${severeCount > 1 ? "s" : ""} Detected`
                  : moderateCount > 0
                  ? `${moderateCount} Moderate Interaction${moderateCount > 1 ? "s" : ""} — Review Required`
                  : "No Critical Drug Interactions Detected"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {result.drug_interactions.length} drug–drug · {foodWarnCount} food/drink warning(s) · {result.resolved.length} medications
              </div>
            </div>
            {(severeCount > 0 || moderateCount > 0) && (
              <div style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
                Pharmacist Review Advised
              </div>
            )}
          </div>

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
            {result.notes && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                📝 {result.notes}
              </div>
            )}
          </Card>

          {/* Resolved medications */}
          <SectionHead icon="💊" title="Resolved Medications"
            sub="Expand each card for administration guide and food/drink interactions" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {result.resolved.map((med, i) => (
              <Card key={i} style={{ borderLeft: `4px solid ${med.ingredient ? "#2563eb" : "#f59e0b"}` }}>
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
                    <div style={{ background: "#f8faff", borderRadius: 9, padding: "9px 12px", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#3730a3", letterSpacing: 0.5 }}>GENERIC — via Mapping Table</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{med.ingredient.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{med.ingredient.drug_class}</div>
                    </div>

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

                    <AdminCard ingredient={med.ingredient} med={med} />
                    <FoodInteractionCard ingredient={med.ingredient} />
                  </>
                )}
              </Card>
            ))}
          </div>

          {/* Drug-Drug Interactions */}
          <SectionHead icon="⚠️"
            title={`Drug–Drug Interactions (${result.drug_interactions.length})`}
            sub="Checked at ingredient level via mapping table" />
          {result.drug_interactions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {result.drug_interactions.map((inter, i) => <DDICard key={i} interaction={inter} />)}
            </div>
          ) : (
            <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 24 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#166534", marginTop: 4 }}>No drug–drug interactions detected</div>
              <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>All medications are safe to co-administer.</div>
            </Card>
          )}

          {/* Food Interaction Summary */}
          <SectionHead icon="🍽️" title="Food & Drink Interaction Summary"
            sub="Combined food warnings for all medications in this prescription" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.resolved.filter((r) => r.ingredient?.food_interactions?.length > 0).map((med, i) => (
              <Card key={i}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#111827" }}>
                  💊 {med.ingredient.name} ({med.name})
                </div>
                {med.ingredient.food_interactions.map((f, j) => {
                  const s = FOOD_SEV[f.severity] ?? FOOD_SEV.info;
                  return (
                    <div key={j} style={{ background: s.bg, borderRadius: 10, padding: "10px 13px", marginBottom: 8, border: `1px solid ${SEV[f.severity]?.border ?? "#e5e7eb"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>🍽️ {f.food}</div>
                        <span style={{ color: s.color, fontSize: 10, fontWeight: 800 }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#374151", margin: "0 0 6px" }}>{f.effect}</p>
                      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", fontWeight: 600 }}>
                        ✅ {f.advice}
                      </div>
                    </div>
                  );
                })}
              </Card>
            ))}
            {result.resolved.every((r) => !r.ingredient?.food_interactions?.length) && (
              <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 24 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#166534", marginTop: 4, fontSize: 13 }}>No food interactions on record</div>
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
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const found = await resolveDrugName(query.trim());
    setResults(found);
    setSelected(null);
    setLoading(false);
  };

  const handleSelect = async (ing) => {
    if (selected?.id === ing.id) { setSelected(null); return; }
    setSelected(ing);
    const prods = await getProductsByIngredient(ing.id);
    setProducts(prods);
  };

  return (
    <div>
      <SectionHead icon="🔍" title="Drug Lookup" sub="Search by brand name, generic, or alias" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Panadol, Brufen, Glucophage, Coartem…"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }} />
        <button onClick={search}
          style={{ padding: "10px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
          Search
        </button>
      </div>

      {loading && <Spinner msg="Searching database…" />}

      {!loading && results.length === 0 && query && (
        <div style={{ textAlign: "center", padding: 28, color: "#6b7280" }}>
          <div style={{ fontSize: 30 }}>💊</div>
          <div style={{ marginTop: 6 }}>No results for "{query}"</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results.map((ing) => (
          <Card key={ing.id} style={{ cursor: "pointer", border: selected?.id === ing.id ? "2px solid #2563eb" : "1px solid #e5e7eb" }}>
            <div onClick={() => handleSelect(ing)}>
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
                    {(ing.side_effects ?? []).map((s) => <div key={s} style={{ fontSize: 12, color: "#374151", padding: "2px 0" }}>• {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>CONTRAINDICATIONS</div>
                    {(ing.contraindications ?? []).map((c) => <div key={c} style={{ fontSize: 12, color: "#dc2626", padding: "2px 0" }}>⚠ {c}</div>)}
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
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      try {
        const { supabase } = await import("./services/supabaseClient");
        const { data } = await supabase
          .from("products")
          .select(`*, product_ingredient_map(ingredient:ingredient_id(id,name,rxcui,drug_class))`)
          .order("brand_name");
        setProducts(data ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  });

  const filtered = products.filter((p) =>
    [p.brand_name, p.manufacturer, p.dosage_form].some(
      (s) => s?.toLowerCase().includes(filter.toLowerCase())
    )
  );

  return (
    <div>
      <SectionHead icon="📦" title="Product Registry" />
      <input value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter products…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
      {loading && <Spinner msg="Loading products…" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p) => {
          const ings = (p.product_ingredient_map ?? []).map((m) => m.ingredient).filter(Boolean);
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
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      try {
        const { supabase } = await import("./services/supabaseClient");
        const { data } = await supabase
          .from("drug_interactions")
          .select(`*, ingredient_a:ingredient_a_id(id,name,rxcui), ingredient_b:ingredient_b_id(id,name,rxcui)`);
        setInteractions(data ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  });

  return (
    <div>
      <SectionHead icon="⚠️" title="Drug–Drug Interaction Reference"
        sub="Checked at ingredient level via mapping table" />
      {loading && <Spinner msg="Loading interactions…" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {interactions.map((inter, i) => <DDICard key={i} interaction={inter} />)}
      </div>
    </div>
  );
}

// ─── MAPPING TAB ──────────────────────────────────────────────────────────────
function MappingTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      try {
        const { supabase } = await import("./services/supabaseClient");
        const { data } = await supabase
          .from("product_ingredient_map")
          .select(`
            *,
            product:product_id(brand_name,manufacturer,dosage_form,nafdac_number,nhis_covered),
            ingredient:ingredient_id(name,rxcui,drug_class)
          `);
        setRows(data ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  });

  return (
    <div>
      <SectionHead icon="🔗" title="Product → Ingredient Mapping Table"
        sub="Bridge table linking every product to its active ingredient and RxNorm CUI" />
      {loading && <Spinner msg="Loading mapping table…" />}
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
                <td style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{row.product?.brand_name}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{row.product?.manufacturer}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{row.product?.dosage_form}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0c4a6e", whiteSpace: "nowrap" }}>{row.ingredient?.name}</td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>{row.ingredient?.drug_class}</td>
                <td style={{ padding: "8px 12px" }}><Badge color="#7c3aed" bg="#ede9fe">{row.ingredient?.rxcui}</Badge></td>
                <td style={{ padding: "8px 12px" }}>{row.product?.nafdac_number ? <Badge color="#059669" bg="#d1fae5">{row.product.nafdac_number}</Badge> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                <td style={{ padding: "8px 12px" }}>{row.product?.nhis_covered ? <Badge color="#2563eb" bg="#dbeafe">✓</Badge> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        {rows.length} mappings loaded from Supabase
      </div>
    </div>
  );
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
function HistoryTab({ history }) {
  if (!history.length)
    return (
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
          const sevCount = scan.drug_interactions?.filter((x) => x.severity === "severe").length ?? 0;
          const modCount = scan.drug_interactions?.filter((x) => x.severity === "moderate").length ?? 0;
          return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Patient: {scan.patient ?? "Unknown"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{scan.prescriber ?? "—"} · {scan.date ?? "—"}</div>
                </div>
                <Badge
                  color={sevCount > 0 ? "#dc2626" : modCount > 0 ? "#ea580c" : "#059669"}
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

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "18px 20px 0", color: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 10px", fontSize: 22 }}>💊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.5px" }}>RxScan Nigeria</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                Prescription Scanner · Drug Interactions · Food Warnings · Administration Guides
              </div>
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