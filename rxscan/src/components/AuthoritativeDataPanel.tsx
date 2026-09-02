import { useState } from "react";

function SourceLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span>{children}</span>;
  return <a href={href} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>{children}</a>;
}

export default function AuthoritativeDataPanel({ result }: { result: any }) {
  const [open, setOpen] = useState(true);
  const evidence = result?.interaction_evidence ?? [];
  const meds = result?.resolved ?? [];
  if (!meds.length) return null;
  return (
    <div style={{ marginBottom: 20, border: "1px solid #c7d2fe", borderRadius: 14, background: "#eef2ff", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#312e81" }}>🧬 Authoritative medicine data</div>
        <div style={{ fontSize: 11, color: "#4f46e5", marginTop: 3 }}>RxNorm identity · Nigerian Essential Medicines List · PubMed evidence</div>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {meds.map((med: any, i: number) => {
            const lists = med.medicine_list_memberships ?? [];
            return <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e0e7ff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13 }}>{med.ingredient?.name ?? med.name}</strong>
                {med.ingredient?.rxcui && <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "3px 7px", borderRadius: 999 }}>RxCUI {med.ingredient.rxcui}</span>}
              </div>
              {lists.length ? lists.map((x: any, j: number) => <div key={j} style={{ marginTop: 7, fontSize: 11, color: "#166534" }}>🇳🇬 <strong>{x.list_name}</strong> · edition {x.edition} · {x.status}<div style={{ marginTop: 2, color: "#6b7280" }}><SourceLink href={x.source_url}>Source</SourceLink></div></div>) : <div style={{ marginTop: 7, fontSize: 11, color: "#92400e" }}>🇳🇬 No Nigerian essential-medicines-list membership found in the imported records.</div>}
            </div>;
          })}
        </div>
        <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #e0e7ff" }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#312e81" }}>📚 PubMed interaction evidence ({evidence.length})</div>
          {evidence.length ? <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>{evidence.slice(0, 8).map((e: any, i: number) => <div key={i} style={{ fontSize: 11, color: "#374151" }}><SourceLink href={e.source_url}>PMID {e.pmid}</SourceLink>{e.publication_year ? ` · ${e.publication_year}` : ""} · {e.title}</div>)}</div> : <div style={{ marginTop: 5, fontSize: 11, color: "#6b7280" }}>No PubMed evidence records were imported for the detected ingredient pairs.</div>}
          <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280" }}>PubMed records are literature evidence. They are not, by themselves, a clinical severity classification.</div>
        </div>
      </div>}
    </div>
  );
}
