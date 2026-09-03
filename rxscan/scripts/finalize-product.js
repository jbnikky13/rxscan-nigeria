const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.tsx');
let s = fs.readFileSync(file, 'utf8');
const original = s;

s = s.replace('import { useState, useRef, useCallback } from "react";', 'import { useState, useRef, useCallback, useEffect } from "react";');
s = s.replace('import { resolveDrugName, getProductsByIngredient, getDrugInteractions, saveScan } from "./services/drugResolver";', 'import { resolveDrugName, getProductsByIngredient, getDrugInteractions, getMedicineListMemberships, getInteractionEvidence, saveScan, getScanHistory } from "./services/drugResolver";');
if (!s.includes('AuthoritativeDataPanel')) s = s.replace('import { callClaudeAPI } from "./services/claudeAPI";', 'import { callClaudeAPI } from "./services/claudeAPI";\nimport AuthPanel from "./components/AuthPanel";\nimport AuthoritativeDataPanel from "./components/AuthoritativeDataPanel";');

const oldBlock = `    const drug_interactions = allIngIds.length > 1\n      ? await getDrugInteractions(allIngIds)\n      : [];\n\n    const final = { ...extracted, resolved, drug_interactions };`;
const newBlock = `    const drug_interactions = allIngIds.length > 1\n      ? await getDrugInteractions(allIngIds)\n      : [];\n\n    setLoadingMsg("Loading Nigerian medicine-list status and PubMed evidence…");\n\n    const resolvedWithLists = await Promise.all(resolved.map(async (row) => ({\n      ...row,\n      medicine_list_memberships: row.ingredient\n        ? await getMedicineListMemberships(row.ingredient.id)\n        : [],\n    })));\n\n    const interaction_evidence = allIngIds.length > 1\n      ? await getInteractionEvidence(allIngIds)\n      : [];\n\n    const final = { ...extracted, resolved: resolvedWithLists, drug_interactions, interaction_evidence };`;
if (s.includes(oldBlock)) s = s.replace(oldBlock, newBlock);
else if (!s.includes('resolvedWithLists')) throw new Error('Could not find interaction processing block');

const oldSave = `        extracted_medications: extracted.medications,\n        resolved_products: resolved,\n        interaction_warnings: drug_interactions,`;
s = s.replace(oldSave, `        extracted_medications: extracted.medications,\n        resolved_products: resolvedWithLists,\n        interaction_warnings: drug_interactions,`);

const marker = '          {/* Prescription meta */}';
if (!s.includes('          <AuthoritativeDataPanel result={result} />')) {
  s = s.replace(marker, '          <AuthoritativeDataPanel result={result} />\n\n' + marker);
}

const oldAppState = `  const [tab, setTab] = useState(0);\n  const [history, setHistory] = useState([]);`;
const refreshBlock = `\n\n  const refreshHistory = useCallback(async () => {\n    const scans = await getScanHistory();\n    setHistory(scans ?? []);\n  }, []);\n\n  useEffect(() => { refreshHistory(); }, [refreshHistory]);`;
if (s.includes(oldAppState) && !s.includes('const refreshHistory = useCallback')) {
  s = s.replace(oldAppState, newAppState = oldAppState + refreshBlock);
}

const oldScan = `{tab === 0 && <ScannerTab onScanComplete={(r) => setHistory((h) => [r, ...h])} />}`;
s = s.replace(oldScan, `{tab === 0 && <ScannerTab onScanComplete={(r) => { setHistory((h) => [r, ...h]); refreshHistory(); }} />}`);

const headerNeedle = `<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>`;
if (!s.includes('<AuthPanel onAuthChange')) {
  s = s.replace(headerNeedle, `<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, position: "relative" }}>\n            <AuthPanel onAuthChange={() => refreshHistory()} />`);
}

if (s === original) {
  console.log('RxScan App integration already up to date; no changes needed');
  process.exit(0);
}
fs.writeFileSync(file, s);
console.log('RxScan App integration patched successfully');
