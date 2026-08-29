const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
]);

function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  if (process.env.APP_ORIGIN && origin === process.env.APP_ORIGIN) return origin;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return process.env.APP_ORIGIN || '*';
}

module.exports = async (req, res) => {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service is not configured.' });

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Prescription text is required.' });
  if (text.length > 20000) return res.status(413).json({ error: 'Prescription text is too long.' });

  const prompt = `Extract structured information from this prescription text. Do not invent missing information. Return ONLY valid JSON with this exact shape:
{"medications":[{"name":"","dosage":"","frequency":"","duration":"","route":""}],"prescriber":null,"date":null,"patient":null,"notes":null}

Text:\n${text}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic error:', response.status, data?.error?.type);
      return res.status(502).json({ error: 'AI extraction service failed.' });
    }

    const raw = data.content?.[0]?.text || '{}';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Claude proxy error:', error.message);
    return res.status(500).json({ error: 'Unable to process prescription text.' });
  }
};
