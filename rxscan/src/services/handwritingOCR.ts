export type HandwritingOCRResult = {
  text: string;
  confidence: number | null;
  words?: Array<{ text: string; confidence: number | null }>;
  handwriting: boolean;
  provider: string;
};

/** Server-side handwriting OCR. Falls back cleanly so Tesseract remains available. */
export async function recognizePrescriptionHandwriting(imageUrl: string): Promise<HandwritingOCRResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Unable to read prescription image (${response.status})`);
  const blob = await response.blob();
  if (blob.size > 6_000_000) throw new Error('Prescription image is too large. Please use a smaller image.');

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'));
    reader.readAsDataURL(blob);
  });

  const result = await fetch('/api/handwriting-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: dataUrl })
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload.error || 'Handwriting OCR failed');
  return payload;
}
