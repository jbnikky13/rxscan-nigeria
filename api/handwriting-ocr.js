const ALLOWED_ORIGIN = process.env.APP_ORIGIN || '*';
const MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';

function send(res, status, body) {
  return res.status(status).json(body);
}

function stripDataUrl(value) {
  return value.replace(/^data:([^;]+);base64,/, (_, mime) => `__MIME__${mime}__BASE64__`);
}

function getMimeAndBase64(value, suppliedMime) {
  const match = value.match(/^data:([^;]+);base64,(.*)$/s);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: suppliedMime || 'image/jpeg', data: value };
}

function parseJson(text) {
  const cleaned = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return send(res, 503, { error: 'Handwriting recognition is not configured. Add GEMINI_API_KEY to the server environment.' });

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') return send(res, 400, { error: 'imageBase64 is required.' });
    if (imageBase64.length > 12_000_000) return send(res, 413, { error: 'Image is too large. Please upload a smaller prescription image.' });

    const image = getMimeAndBase64(imageBase64, mimeType);
    const prompt = `You are the prescription handwriting recognition layer for RxScan Nigeria. Inspect this prescription image carefully.

Extract only medication and prescription information that is visibly supported by the image. Handwriting may be poor, abbreviated, or partially illegible. NEVER invent a medicine name, strength, dose, frequency, route, or duration.

Return ONLY valid JSON with this exact shape:
{
  "raw_text": "best faithful transcription of readable prescription text",
  "medications": [
    {
      "name": "best transcription of medicine name, or empty string if unclear",
      "strength": "strength exactly as read, or empty string",
      "dose": "dose exactly as read, or empty string",
      "frequency": "frequency exactly as read, or empty string",
      "route": "route exactly as read, or empty string",
      "duration": "duration exactly as read, or empty string",
      "confidence": 0.0,
      "uncertain": true,
      "alternatives": ["possible reading 1", "possible reading 2"]
    }
  ],
  "overall_confidence": 0.0,
  "needs_confirmation": true,
  "warnings": ["brief reason if anything is unclear"]
}

Rules:
- confidence and overall_confidence must be numbers from 0 to 1.
- Set uncertain=true when the medication name is not clearly readable.
- Put at most 3 plausible alternatives, and only when they are visually plausible.
- Do not use medical knowledge to fill in missing text.
- Preserve common prescription abbreviations when they are actually written.
- If no medicine can be read, return an empty medications array and needs_confirmation=true.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'Gemini prescription recognition failed.';
      return send(res, response.status >= 400 ? response.status : 502, { error: message });
    }

    const text = (data?.candidates || []).flatMap(c => c?.content?.parts || []).map(p => p?.text || '').join('');
    const parsed = parseJson(text);
    if (!parsed || !Array.isArray(parsed.medications)) {
      return send(res, 502, { error: 'The handwriting model returned an invalid recognition result.' });
    }

    const medications = parsed.medications.map(m => ({
      name: String(m?.name || '').trim(),
      strength: String(m?.strength || '').trim(),
      dose: String(m?.dose || '').trim(),
      frequency: String(m?.frequency || '').trim(),
      route: String(m?.route || '').trim(),
      duration: String(m?.duration || '').trim(),
      confidence: Math.max(0, Math.min(1, Number(m?.confidence) || 0)),
      uncertain: Boolean(m?.uncertain) || !String(m?.name || '').trim(),
      alternatives: Array.isArray(m?.alternatives) ? m.alternatives.map(String).filter(Boolean).slice(0, 3) : []
    }));

    const overall = Math.max(0, Math.min(1, Number(parsed.overall_confidence) || (medications.length ? medications.reduce((s, m) => s + m.confidence, 0) / medications.length : 0)));
    return send(res, 200, {
      text: String(parsed.raw_text || '').trim(),
      raw_text: String(parsed.raw_text || '').trim(),
      medications,
      confidence: overall,
      overall_confidence: overall,
      needs_confirmation: Boolean(parsed.needs_confirmation) || medications.some(m => m.uncertain || m.confidence < 0.75),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).filter(Boolean).slice(0, 5) : [],
      handwriting: true,
      provider: `gemini-${MODEL}`
    });
  } catch (error) {
    console.error('Gemini handwriting recognition error', error);
    return send(res, 500, { error: 'Unable to process the prescription image.' });
  }
}
