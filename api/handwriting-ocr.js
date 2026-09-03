const ALLOWED_ORIGIN = process.env.APP_ORIGIN || '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!key) return res.status(503).json({ error: 'Handwriting OCR is not configured. Add GOOGLE_CLOUD_VISION_API_KEY.' });

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') return res.status(400).json({ error: 'imageBase64 is required.' });
    const clean = imageBase64.replace(/^data:[^;]+;base64,/, '');
    if (clean.length > 8_000_000) return res.status(413).json({ error: 'Image is too large. Please upload a smaller image.' });

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ image: { content: clean }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], imageContext: { languageHints: ['en-t-i0-handwrit'] } }] })
    });
    const data = await response.json();
    if (!response.ok || data.responses?.[0]?.error) {
      const message = data.responses?.[0]?.error?.message || data.error?.message || 'Vision OCR failed';
      return res.status(response.status >= 400 ? response.status : 502).json({ error: message });
    }

    const annotation = data.responses?.[0]?.fullTextAnnotation;
    const words = [];
    for (const page of annotation?.pages || []) {
      for (const block of page.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            const text = (word.symbols || []).map(s => s.text || '').join('');
            const confidence = typeof word.confidence === 'number' ? word.confidence : null;
            if (text) words.push({ text, confidence });
          }
        }
      }
    }
    const confidences = words.map(w => w.confidence).filter(v => typeof v === 'number');
    const confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
    return res.status(200).json({
      text: annotation?.text || '',
      confidence,
      words,
      handwriting: true,
      provider: 'google-cloud-vision-document-text-detection'
    });
  } catch (error) {
    console.error('handwriting OCR error', error);
    return res.status(500).json({ error: 'Unable to process the prescription image.' });
  }
}
