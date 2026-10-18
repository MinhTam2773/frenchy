import { tokenize, type TextToken } from './tokenize';

/** One sentence: `text.slice(start, end)`, without surrounding whitespace. */
export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

const TERMINATOR = /[.!?…]+/;
/** Closing quotes and brackets after the terminator stay in the sentence (*« Oui ! »*). */
const CLOSERS = /^(?:\s*[»”’"')\]])*/;
/** A gap that ends with one of these starts a new sentence (*. « Bonjour*, *. — Non*). */
const OPENERS = /[«“"'([—–-]/;
const BLANK_LINE = /\n\s*\n/;

/**
 * Splits text into sentences. A sentence ends at `. ! ? …` (with any closing quotes) when the next
 * word starts with a capital letter, an opening quote or dash follows, or the text ends; and always
 * at a blank line. Titles (*M.*, *Mme.*, *Dr.*) are words, so they never end one, and neither does
 * an initial (*J. K.*). An ellipsis before a lower-case word (*Je… je sais*) doesn't either.
 */
export function splitSentences(text: string): SentenceSpan[] {
  const tokens = tokenize(text);
  const spans: SentenceSpan[] = [];
  let start = 0;
  tokens.forEach((token, i) => {
    if (token.kind === 'gap' && i > 0) {
      const end = sentenceEnd(token, tokens[i - 1], tokens[i + 1]);
      if (end !== undefined) {
        pushSpan(spans, text, start, end);
        start = end;
      }
    }
  });
  pushSpan(spans, text, start, text.length);
  return spans;
}

/** The offset where a sentence ends inside this gap, if it does. */
function sentenceEnd(
  gap: TextToken,
  before: TextToken,
  after: TextToken | undefined,
): number | undefined {
  const blank = BLANK_LINE.exec(gap.t);
  if (blank) return gap.start + blank.index;
  const terminator = TERMINATOR.exec(gap.t);
  if (!terminator) return undefined;
  if (terminator.index === 0 && terminator[0] === '.' && /^\p{Lu}$/u.test(before.t)) {
    return undefined;
  }
  let end = terminator.index + terminator[0].length;
  end += CLOSERS.exec(gap.t.slice(end))?.[0].length ?? 0;
  const rest = gap.t.slice(end).trimStart();
  const startsNew = rest
    ? OPENERS.test(rest.charAt(0))
    : after === undefined || /^\p{Lu}/u.test(after.t);
  return startsNew ? gap.start + end : undefined;
}

function pushSpan(spans: SentenceSpan[], text: string, from: number, to: number): void {
  const raw = text.slice(from, to);
  const lead = raw.length - raw.trimStart().length;
  const sentence = raw.trim();
  if (/[\p{L}\p{N}]/u.test(sentence)) {
    spans.push({ text: sentence, start: from + lead, end: from + lead + sentence.length });
  }
}
