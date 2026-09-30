// Screenshot handling for the Leak Report, all in the browser (no server memory):
// read/downscale an image, and draw TitanLeap's pen mark onto it.
export type MarkBox = { x: number; y: number; w: number; h: number }; // fractions 0-1

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('That file is not an image'));
  img.src = src;
});

// Downscale to 1400px wide JPEG so the report stays light.
export async function readScreenshot(file: File | Blob): Promise<{ dataUrl: string; width: number; height: number }> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('That file is not an image');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1400 / img.naturalWidth);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read image');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Purple pen box + gold highlighter fill + optional note pill, matching the report.
export async function drawMark(raw: string, box: MarkBox | null, note?: string): Promise<string> {
  const img = await loadImage(raw);
  const W = img.naturalWidth, H = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw');
  ctx.drawImage(img, 0, 0);
  if (box) {
    const lw = Math.max(3, Math.round(W / 260));
    const pad = Math.round(W / 140);
    const x = Math.max(lw, box.x * W - pad);
    const y = Math.max(lw, box.y * H - pad);
    const w = Math.min(W - x - lw, box.w * W + pad * 2);
    const h = Math.min(H - y - lw, box.h * H + pad * 2);
    const r = Math.min(18, h / 3, w / 3);
    rounded(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(245,197,24,.18)'; ctx.fill();
    rounded(ctx, x, y, w, h, r); ctx.lineWidth = lw + 5; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.stroke();
    rounded(ctx, x, y, w, h, r); ctx.lineWidth = lw; ctx.strokeStyle = '#6B21E8'; ctx.stroke();
    const text = (note || '').trim();
    if (text) {
      const fs = Math.max(15, Math.round(W / 58));
      ctx.font = `700 ${fs}px Archivo, "Helvetica Neue", Arial, sans-serif`;
      const pw = ctx.measureText(text).width + fs * 1.2, ph = fs * 1.75;
      const lx = Math.min(Math.max(2, x), W - pw - 2);
      let ly = y - ph - lw - 6;
      if (ly < 2) ly = Math.min(H - ph - 2, y + h + lw + 6);
      rounded(ctx, lx, ly, pw, ph, ph / 2); ctx.fillStyle = '#6B21E8'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, lx + fs * 0.6, ly + ph / 2 + 1);
    }
  }
  return canvas.toDataURL('image/jpeg', 0.85);
}
