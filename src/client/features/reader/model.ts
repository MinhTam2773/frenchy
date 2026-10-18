import { CLOZE_BLANK, MAX_AI_TEXT_LENGTH } from '@shared/constants';
import type { CardCreate, Text, Token, WordToken } from '@shared/schemas';
import type { WordInfo } from '@shared/text';

export interface ReaderSentence {
  index: number;
  tokens: Token[];
  /** Index of `tokens[0]` in the whole text, so every token has one number. */
  start: number;
  text: string;
  en: string;
}

export interface ReaderParagraph {
  speaker?: string;
  sentences: ReaderSentence[];
}

export interface ReaderModel {
  paragraphs: ReaderParagraph[];
  sentences: ReaderSentence[];
  /** Global token index → its sentence index. */
  sentenceOf: number[];
  /** Global indexes of the word tokens, in reading order (for arrow-key moves). */
  wordIndexes: number[];
}

/** A run of whole sentences, `from` to `to` inclusive. */
export interface SentenceRange {
  from: number;
  to: number;
}

export interface Passage {
  text: string;
  en: string;
  words: WordToken[];
  /** Over the AI and card length limit, so it can't be explained or saved. */
  tooLong: boolean;
}

export function isWord(token: Token): token is WordToken {
  return 'lemma' in token;
}

export function buildReaderModel(text: Text): ReaderModel {
  const sentences: ReaderSentence[] = [];
  const sentenceOf: number[] = [];
  const wordIndexes: number[] = [];
  const paragraphs = text.paragraphs.map((paragraph) => ({
    speaker: paragraph.speaker,
    sentences: paragraph.sentences.map((sentence) => {
      const index = sentences.length;
      const start = sentenceOf.length;
      sentence.tokens.forEach((token, i) => {
        sentenceOf.push(index);
        if (isWord(token)) wordIndexes.push(start + i);
      });
      const built: ReaderSentence = {
        index,
        tokens: sentence.tokens,
        start,
        text: sentence.tokens.map((token) => token.t).join(''),
        en: sentence.en,
      };
      sentences.push(built);
      return built;
    }),
  }));
  return { paragraphs, sentences, sentenceOf, wordIndexes };
}

export function tokenAt(model: ReaderModel, index: number): Token {
  const sentence = model.sentences[model.sentenceOf[index]];
  return sentence.tokens[index - sentence.start];
}

/** The sentences from the one holding token `a` to the one holding token `b`, in either order. */
export function rangeBetween(model: ReaderModel, a: number, b: number): SentenceRange {
  const [x, y] = [model.sentenceOf[a], model.sentenceOf[b]];
  return { from: Math.min(x, y), to: Math.max(x, y) };
}

function rangeSentences(model: ReaderModel, { from, to }: SentenceRange): ReaderSentence[] {
  return model.sentences.slice(from, to + 1);
}

export function passage(model: ReaderModel, range: SentenceRange): Passage {
  const sentences = rangeSentences(model, range);
  const text = sentences.map((s) => s.text).join(' ');
  return {
    text,
    en: sentences.map((s) => s.en).join(' '),
    words: sentences.flatMap((s) => s.tokens.filter(isWord)),
    tooLong: text.length > MAX_AI_TEXT_LENGTH,
  };
}

/** Optional card fields must be non-empty and short enough for `CardCreate`. */
function fit(value: string | undefined, max: number): string | undefined {
  return value && value.length <= max ? value : undefined;
}

/** "Save word": the word as written (a name keeps its capital), its meaning in this sentence. */
export function wordCard(info: WordInfo, sentence: string): CardCreate {
  const front = info.pos === 'name' ? info.word : info.word.toLocaleLowerCase('fr');
  const lemmaLine = info.lemma.toLocaleLowerCase('fr') === front ? undefined : info.lemma;
  return {
    type: 'sentence_meaning',
    front,
    back: info.glosses.join('; '),
    hint: fit(sentence, 200),
    note: fit([lemmaLine, info.form].filter(Boolean).join(' · '), 300),
    source: { kind: 'word', ref: info.lemma },
  };
}

export function sentenceCard(p: Passage, textId: string): CardCreate {
  return {
    type: 'sentence_meaning',
    front: p.text,
    back: p.en,
    source: { kind: 'text', ref: textId },
  };
}

/** Blanks the token at global index `blank`, which must be a word inside `range`. */
export function clozeCard(
  model: ReaderModel,
  range: SentenceRange,
  blank: number,
  textId: string,
): CardCreate {
  const sentences = rangeSentences(model, range);
  const front = sentences
    .map((s) => s.tokens.map((t, i) => (s.start + i === blank ? CLOZE_BLANK : t.t)).join(''))
    .join(' ');
  const p = passage(model, range);
  return {
    type: 'cloze',
    front,
    back: p.text,
    clozeAnswer: tokenAt(model, blank).t,
    hint: fit(p.en, 200),
    source: { kind: 'text', ref: textId },
  };
}
