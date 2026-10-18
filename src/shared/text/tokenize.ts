/**
 * A piece of text. Word tokens hold a letter or digit and gap tokens hold everything else (spaces
 * and punctuation), exactly like content `WordToken` / `GapToken`, so joining every `t` gives the
 * input back. Offsets are into the original string: `text.slice(start, end) === t`.
 */
export interface TextToken {
  kind: 'word' | 'gap';
  t: string;
  start: number;
  end: number;
}

/** The content schema's test for a word token: it has a letter or a digit. */
export function isWordText(t: string): boolean {
  return /[\p{L}\p{N}]/u.test(t);
}

/** Apostrophes and hyphens join letters into one run; the run is then split by French rules. */
const APOSTROPHES = "'’‘ʼ";
const HYPHENS = '-‐‑';
const WORD = new RegExp(
  `[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:[${APOSTROPHES}\\${HYPHENS}][\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*`,
  'uy',
);
/** Clock times stay one token: *8 h 30*, *8h30*, *12 h*. */
const TIME = /\d{1,2}[ \u00A0\u202F]?h(?:[ \u00A0\u202F]?\d{2})?(?![\p{L}\p{N}])/uy;
/** *12,50*, *1 000* (thousands with a no-break or thin space), then an ordinal suffix (*1er*, *2e*). */
const NUMBER = /\d+(?:[\u00A0\u202F\u2009]\d{3}(?!\d))*(?:[.,]\d+)?[\p{L}\p{M}\p{N}]*/uy;

/** Words that drop their vowel before another vowel; the apostrophe stays in their token. */
const ELISIONS = new Set([
  'l',
  'd',
  'j',
  'm',
  't',
  's',
  'n',
  'c',
  'ç',
  'qu',
  'jusqu',
  'lorsqu',
  'puisqu',
  'quoiqu',
]);

/** Pronouns that follow a verb with a hyphen (*parles-tu*, *dis-moi*, *a-t-il*). */
const CLITICS = new Set([
  'je',
  'moi',
  'tu',
  'toi',
  'il',
  'elle',
  'on',
  'nous',
  'vous',
  'ils',
  'elles',
  'ce',
  'le',
  'la',
  'les',
  'lui',
  'leur',
  'y',
  'en',
]);

/** Compounds that would otherwise look like an inversion or an elision. */
const FIXED = new Set(['rendez-vous', "c'est-à-dire"]);

/** Titles whose period belongs to the word (*M. Dupont*); they never end a sentence. */
const TITLES = new Set(['M', 'MM', 'Mme', 'Mmes', 'Mlle', 'Mlles', 'Dr', 'Pr', 'St', 'Ste', 'Mgr']);

/** Lower case with apostrophes folded to `'`, for comparing a piece against the word lists. */
function keyOf(piece: string): string {
  return piece.toLowerCase().replace(/[’‘ʼ]/g, "'");
}

/** Splits French text into word and gap tokens (see `TextToken`). */
export function tokenize(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let gapStart = 0;
  let i = 0;
  while (i < text.length) {
    const run = matchWordAt(text, i);
    if (!run) {
      i += 1;
      continue;
    }
    if (gapStart < i) tokens.push(token('gap', text.slice(gapStart, i), gapStart));
    tokens.push(...splitRun(run, i));
    i += run.length;
    gapStart = i;
  }
  if (gapStart < text.length) tokens.push(token('gap', text.slice(gapStart), gapStart));
  return tokens;
}

function matchWordAt(text: string, at: number): string | undefined {
  for (const pattern of /\d/.test(text.charAt(at)) ? [TIME, NUMBER] : [WORD]) {
    pattern.lastIndex = at;
    const match = pattern.exec(text);
    if (match) {
      const run = match[0];
      return TITLES.has(run) && text.charAt(at + run.length) === '.' ? `${run}.` : run;
    }
  }
  return undefined;
}

function token(kind: TextToken['kind'], t: string, start: number): TextToken {
  return { kind, t, start, end: start + t.length };
}

/** One letter run → words and `-` gaps: inverted pronouns split off, then elisions. */
function splitRun(run: string, start: number): TextToken[] {
  if (/^\d/.test(run) || FIXED.has(keyOf(run))) return [token('word', run, start)];
  // WORD allows only single hyphens between letters, so segments alternate word, hyphen, word...
  const segments = run.split(new RegExp(`([\\${HYPHENS}])`));
  // `cut` is the hyphen before the first trailing pronoun; the first word is never one.
  let cut = segments.length;
  while (cut > 2 && isClitic(segments[cut - 1], segments[cut + 1])) cut -= 2;
  const head = segments.slice(0, cut).join('');
  const tokens = splitElisions(head, start);
  let at = start + head.length;
  for (const segment of segments.slice(cut)) {
    tokens.push(
      ...(segment.length === 1 && HYPHENS.includes(segment)
        ? [token('gap', segment, at)]
        : splitElisions(segment, at)),
    );
    at += segment.length;
  }
  return tokens;
}

/** `next` is the segment after this one, if any; the euphonic *t* needs a pronoun after it. */
function isClitic(segment: string, next: string | undefined): boolean {
  const key = keyOf(segment);
  if (key === 't') return next !== undefined && ['il', 'elle', 'on'].includes(keyOf(next));
  return CLITICS.has(key) || /^[mt]'(?:en|y)$/.test(key);
}

/** *l'homme* → *l'* + *homme*; *aujourd'hui* and *quelqu'un* stay whole. */
function splitElisions(piece: string, start: number): TextToken[] {
  const tokens: TextToken[] = [];
  let from = 0;
  for (let i = 0; i < piece.length; i++) {
    if (APOSTROPHES.includes(piece.charAt(i)) && ELISIONS.has(keyOf(piece.slice(from, i)))) {
      tokens.push(token('word', piece.slice(from, i + 1), start + from));
      from = i + 1;
    }
  }
  tokens.push(token('word', piece.slice(from), start + from));
  return tokens;
}
