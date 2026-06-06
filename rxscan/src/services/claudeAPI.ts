export async function callClaudeAPI(ocrText: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a pharmacist assistant. Extract all medications from this prescription text.
Return ONLY valid JSON — no markdown, no preamble:
{"medications":[{"name":"drug name","dosage":"e.g.500mg","frequency":"e.g.twice daily","duration":"e.g.7 days","route":"e.g.oral"}],"prescriber":"or null","date":"or null","patient":"or null","notes":"or null"}
Text:\n${ocrText}`,
      }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text ?? '{}';
  return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
}
