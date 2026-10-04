// Parse a prospect CSV (from the outbound lead builder) into rows for the `leads` table.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', inQ = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some(v => v.trim())) rows.push(row); }
  if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export interface LeadInsert {
  name: string; email: string; phone: string | null; company: string;
  source: string; status: string; product: string; score: number; score_reason: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Rows without a valid email are skipped. Everything else the table has no column for goes in score_reason. */
export function toLeadRows(rows: Record<string, string>[]): { leads: LeadInsert[]; skipped: number } {
  const leads: LeadInsert[] = [];
  let skipped = 0;
  for (const r of rows) {
    const email = (r.email || '').toLowerCase();
    if (!EMAIL_RE.test(email)) { skipped++; continue; }
    const company = r.business || r.company || '';
    const notes = [
      r.hook,
      r.instagram && `IG: ${r.instagram}`,
      r.website && `Site: ${r.website}`,
      (r.email_type || r.email_status) && `Email: ${[r.email_type, r.email_status].filter(Boolean).join(', ')}`,
    ].filter(Boolean).join(' | ');
    leads.push({
      name: r.contact_name || company || email,
      email,
      phone: r.phone || null,
      company,
      source: `Outbound: ${[r.niche, r.city].filter(Boolean).join(' · ') || 'prospect list'}`,
      status: 'COLD',
      product: 'Leak Audit',
      score: Math.max(0, Math.min(100, parseInt(r.score || '0', 10) || 0)),
      score_reason: notes.slice(0, 900),
    });
  }
  return { leads, skipped };
}

export interface LeadDetails { hook: string; instagram: string; website: string; emailQuality: string }

/** Reads back what toLeadRows packed into score_reason: "hook | IG: url | Site: url | Email: type, status". */
export function parseLeadNotes(notes: string | null | undefined): LeadDetails {
  const d: LeadDetails = { hook: '', instagram: '', website: '', emailQuality: '' };
  for (const part of String(notes || '').split(' | ')) {
    if (part.startsWith('IG: ')) d.instagram = part.slice(4).trim();
    else if (part.startsWith('Site: ')) d.website = part.slice(6).trim();
    else if (part.startsWith('Email: ')) d.emailQuality = part.slice(7).trim();
    else if (!d.hook) d.hook = part.trim();
  }
  return d;
}
