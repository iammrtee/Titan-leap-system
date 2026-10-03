// Pull the first valid JSON object out of model text. Models sometimes add prose or
// citations before/after the JSON, and the first "{" to the last "}" slice breaks as soon
// as that prose contains a brace. This scans for balanced objects and returns the first
// one that parses.
export function extractJsonObject<T = any>(text: string): T | null {
  const s = (text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(s.trim()) as T; } catch { /* fall through to scanning */ }
  for (let start = s.indexOf('{'); start !== -1; start = s.indexOf('{', start + 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)) as T; } catch { break; }
      }
    }
  }
  return null;
}
