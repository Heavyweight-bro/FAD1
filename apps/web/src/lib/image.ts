export type BoxPct = { x: number; y: number; width: number; height: number };

export async function cropPngBase64FromImageBase64(input: { base64: string; mimeType: string }, boxPct: BoxPct) {
  const img = new Image();
  img.src = `data:${input.mimeType};base64,${input.base64}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  const sx = Math.max(0, Math.min(100, boxPct.x));
  const sy = Math.max(0, Math.min(100, boxPct.y));
  const sw = Math.max(0, Math.min(100, boxPct.width));
  const sh = Math.max(0, Math.min(100, boxPct.height));

  const x = Math.round((sx / 100) * img.width);
  const y = Math.round((sy / 100) * img.height);
  const w = Math.max(1, Math.round((sw / 100) * img.width));
  const h = Math.max(1, Math.round((sh / 100) * img.height));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1] ?? '';
  if (!base64) throw new Error('Failed to crop image');
  return { base64, mimeType: 'image/png' as const };
}

