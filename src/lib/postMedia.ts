// Helpers for media attached to scheduled posts.

// Supabase Storage rejects keys with spaces, accents and some punctuation
// (macOS screenshot names contain a narrow no-break space).
export function safeStorageName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'file';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext ? `${base}.${ext}` : base;
}

const MAX_SIDE = 1440; // Instagram's maximum width; plenty for Facebook and LinkedIn too.

// Instagram's publishing API only accepts JPEG images, so PNG/WebP exports are
// redrawn as JPEG (white background for transparency) and capped at 1440px.
// Returns the original file if the browser can't decode it.
export async function toPostableJpeg(file: File): Promise<{ file: File; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file, width: 0, height: 0 };
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  if (file.type === 'image/jpeg' && scale === 1 && file.size <= 8 * 1024 * 1024) {
    bitmap.close();
    return { file, width, height };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return { file, width, height }; }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return { file, width, height };
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return { file: new File([blob], name, { type: 'image/jpeg' }), width, height };
}

// Instagram feed images must be between 4:5 (portrait) and 1.91:1 (landscape).
export function instagramRatioProblem(width: number, height: number): string | null {
  if (!width || !height) return null;
  const ratio = width / height;
  if (ratio < 0.8 - 0.01) return 'too tall for Instagram (max 4:5 portrait)';
  if (ratio > 1.91 + 0.01) return 'too wide for Instagram (max 1.91:1 landscape)';
  return null;
}
