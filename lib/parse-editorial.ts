// lib/parse-editorial.ts
// Parses WooCommerce product description HTML into structured editorial content.
//
// ══════════════════════════════════════════════════════════════════
// ADMIN FORMAT — paste this template into WooCommerce > Product >
// Description (Text / HTML tab, NOT Visual), fill in values:
//
//   TITLE:
//   AP X SWATCH ROYAL POPP
//
//   SUBTITLE:
//   A bold, playful statement piece built for colour, summer energy
//   and everyday wrist presence.
//
//   INTRO:
//   The AP X SWATCH Royal Popp brings together the shape and
//   attitude of a luxury sports watch with the fun, lightweight feel
//   of modern streetwear culture.
//
//   REFERENCE:
//   310.30.42.50.01.001
//
//   CASE:
//   Lightweight coloured case
//
//   CRYSTAL:
//   Mineral crystal
//
//   STYLE:
//   Statement watch
//
//   STATUS:
//   Starter Drop 001
//
//   ACCORDION 1 TITLE:
//   Moonwatch Heritage
//
//   ACCORDION 1 BODY:
//   A playful entry into the world of watch collecting, combining
//   bold colour, recognisable design language and everyday wearability.
//
//   ACCORDION 2 TITLE:
//   Colourful Wrist Presence
//
//   ACCORDION 2 BODY:
//   The bright green finish gives the watch a strong visual identity.
//
//   ACCORDION 3 TITLE:
//   Starter Drop Energy
//
//   ACCORDION 3 BODY:
//   Chosen for the first Starter Drop because it keeps the entry
//   barrier low while still giving members a fun, exciting prize.
//
//   QUOTE:
//   Not every piece needs to be serious to be memorable. Some pieces
//   win because they bring energy, colour and personality to the wrist.
//
//   QUOTE SOURCE:
//   Premium Watch Club · Starter Drop
//
// RULES FOR EDITING:
//   • Labels must be in ALL_CAPS (A–Z, 0–9, spaces only) followed by a colon.
//   • Values may be on the same line as the label or on the next lines.
//   • Multiple lines of text for the same field are joined with a space.
//   • You can safely edit any value — only the text changes, never the design.
//   • Do NOT change the label words (e.g. "ACCORDION 1 TITLE:") themselves.
// ══════════════════════════════════════════════════════════════════

export interface ParsedSpec {
  key: string
  value: string
}

export interface ParsedFeature {
  label: string
  badge: string
  text: string
}

export interface ParsedEditorial {
  title: string
  subline: string
  paragraphs: string[]
  specs: ParsedSpec[]
  features: ParsedFeature[]
  quote: string
  quoteAttr: string
}

// ── HTML → plain text lines ───────────────────────────────────────────────────

function htmlToLines(html: string): string[] {
  return html
    // Strip HTML/Gutenberg block comments first
    .replace(/<!--[\s\S]*?-->/g, '')
    // Inline breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // CLOSING block-level tags → newlines
    .replace(/<\/(?:p|h[1-6]|li|ul|ol|div|tr|td|th|blockquote|section|article|figure)>/gi, '\n')
    // OPENING block-level tags → newlines (Gutenberg often omits closing tags)
    .replace(/<(?:p|h[1-6]|li|ul|ol|div|tr|td|th|blockquote|section|article|figure)[^>]*>/gi, '\n')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Named entities
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&nbsp;/g,  ' ')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#\d+;/g,  '')
    .replace(/&[a-z]+;/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

// ── LABEL_MAP ─────────────────────────────────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  'TITLE':              'TITLE',
  'SUBTITLE':           'SUBTITLE',
  'TAGLINE':            'SUBTITLE',
  'INTRO':              'INTRO',
  'INTRO TEXT':         'INTRO',
  'DESCRIPTION':        'INTRO',
  'STORY':              'INTRO',
  'REFERENCE':          'REFERENCE',
  'REF':                'REFERENCE',
  'CASE':               'CASE',
  'CRYSTAL':            'CRYSTAL',
  'STYLE':              'STYLE',
  'MOVEMENT':           'MOVEMENT',
  'CALIBRE':            'MOVEMENT',
  'CALIBER':            'MOVEMENT',
  'STATUS':             'STATUS',
  'ACCORDION 1 TITLE':  'ACC1_TITLE',
  'ACCORDION 1 BADGE':  'ACC1_BADGE',
  'ACCORDION 1 BODY':   'ACC1_BODY',
  'ACCORDION 2 TITLE':  'ACC2_TITLE',
  'ACCORDION 2 BADGE':  'ACC2_BADGE',
  'ACCORDION 2 BODY':   'ACC2_BODY',
  'ACCORDION 3 TITLE':  'ACC3_TITLE',
  'ACCORDION 3 BADGE':  'ACC3_BADGE',
  'ACCORDION 3 BODY':   'ACC3_BODY',
  'SECTION 1 TITLE':    'ACC1_TITLE',
  'SECTION 1 BADGE':    'ACC1_BADGE',
  'SECTION 1 BODY':     'ACC1_BODY',
  'SECTION 2 TITLE':    'ACC2_TITLE',
  'SECTION 2 BADGE':    'ACC2_BADGE',
  'SECTION 2 BODY':     'ACC2_BODY',
  'SECTION 3 TITLE':    'ACC3_TITLE',
  'SECTION 3 BADGE':    'ACC3_BADGE',
  'SECTION 3 BODY':     'ACC3_BODY',
  'QUOTE':              'QUOTE',
  'PULL QUOTE':         'QUOTE',
  'QUOTE SOURCE':       'QUOTE_SOURCE',
  'ATTRIBUTION':        'QUOTE_SOURCE',
}

// ── Label matching ─────────────────────────────────────────────────────────────
//
// A line is a label only when ALL of these hold:
//   1. There is a colon somewhere after the second character.
//   2. The text before the colon consists solely of A–Z, 0–9, and spaces
//      (ALL_CAPS — so normal prose "Style: elegant" is rejected because 's'
//      and 't' are lowercase letters).
//   3. The key is ≤ 25 characters (longest valid key is "ACCORDION 3 TITLE" = 18).
//   4. The normalised key exists in LABEL_MAP.
//
// These rules mean you can freely write any sentence in the INTRO or BODY
// fields that happens to start with a word like "Style" or "Case" followed
// by a colon — it will never be mistaken for a label.

function matchLabel(line: string): { field: string; inlineValue: string } | null {
  const colonIdx = line.indexOf(':')
  if (colonIdx < 2) return null

  const rawKey = line.slice(0, colonIdx).trim()

  // Must be ALL_CAPS (A–Z, 0–9, spaces only) — rejects sentence-case prose
  if (!/^[A-Z0-9][A-Z0-9 ]*$/.test(rawKey)) return null

  // Labels are short — guard against accidental long matches
  if (rawKey.length > 25) return null

  // Collapse extra internal spaces before lookup
  const field = LABEL_MAP[rawKey.replace(/\s+/g, ' ')]
  if (!field) return null

  return { field, inlineValue: line.slice(colonIdx + 1).trim() }
}

// ── Labeled-key parser ────────────────────────────────────────────────────────

function parseLabeledDescription(lines: string[]): ParsedEditorial {
  const map: Record<string, string[]> = {}
  let currentField: string | null = null

  for (const line of lines) {
    const label = matchLabel(line)
    if (label !== null) {
      currentField = label.field
      map[currentField] = label.inlineValue ? [label.inlineValue] : []
    } else if (currentField && line) {
      if (!map[currentField]) map[currentField] = []
      map[currentField].push(line)
    }
  }

  const get = (k: string): string => (map[k] ?? []).join(' ').trim()

  // Spec strip (up to 5 columns)
  const specs: ParsedSpec[] = []
  if (get('REFERENCE')) specs.push({ key: 'Reference', value: get('REFERENCE') })
  if (get('CASE'))      specs.push({ key: 'Case',      value: get('CASE') })
  if (get('CRYSTAL'))   specs.push({ key: 'Crystal',   value: get('CRYSTAL') })
  const styleVal   = get('STYLE') || get('MOVEMENT')
  const styleLabel = get('STYLE') ? 'Style' : 'Movement'
  if (styleVal)         specs.push({ key: styleLabel,  value: styleVal })
  if (get('STATUS'))    specs.push({ key: 'Status',    value: get('STATUS') })

  // Accordion cards (up to 3)
  const features: ParsedFeature[] = []
  for (let n = 1; n <= 3; n++) {
    const label = get(`ACC${n}_TITLE`)
    const badge = get(`ACC${n}_BADGE`)
    const text  = get(`ACC${n}_BODY`)
    if (label || text) features.push({ label, badge, text })
  }

  const intro = get('INTRO')

  return {
    title:      get('TITLE'),
    subline:    get('SUBTITLE'),
    paragraphs: intro ? [intro] : [],
    specs:      specs.slice(0, 5),
    features:   features.slice(0, 3),
    quote:      get('QUOTE'),
    quoteAttr:  get('QUOTE_SOURCE'),
  }
}

// ── Public entry point ────────────────────────────────────────────────────────
//
// Label-based parsing only — no heuristic fallback.
//
// Why no heuristic: a heuristic parser tries to guess structure from ALL_CAPS
// headers and keyword patterns. Any word change in the description can flip
// whether a line is classified as a section header or body text, producing
// completely different field assignments and therefore completely different
// frontend output. Removing the heuristic makes parsing deterministic:
//   • Labels found  → labeled parser runs, fields are stable.
//   • No labels     → returns null, component falls back to ACF competition data.
//
// If the description has never been set up with labels, this function returns
// null and the component renders from the competition's ACF fields instead.

export function parseEditorialDescription(html: string): ParsedEditorial | null {
  if (!html?.trim()) return null
  const lines = htmlToLines(html)
  if (lines.length === 0) return null

  // Only run the labeled parser when at least one label is detected
  const hasLabels = lines.some(l => matchLabel(l) !== null)
  if (!hasLabels) return null

  return parseLabeledDescription(lines)
}
