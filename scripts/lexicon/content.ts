import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ContentWord {
  t: string;
  lemma: string;
  pos: string;
  file: string;
}

interface TextFile {
  paragraphs?: { sentences?: { tokens?: { t: string; lemma?: string; pos?: string }[] }[] }[];
}

/** Every word token in the lesson texts (any `texts/*.json` below `contentDir`). `content:check` validates them. */
export function contentWords(contentDir: string): ContentWord[] {
  if (!existsSync(contentDir)) return [];
  const files = readdirSync(contentDir, { recursive: true, encoding: 'utf8' })
    .filter((path) => /(^|[\\/])texts[\\/][^\\/]+\.json$/.test(path))
    .sort();
  const words: ContentWord[] = [];
  for (const file of files) {
    const text = JSON.parse(readFileSync(join(contentDir, file), 'utf8')) as TextFile;
    for (const paragraph of text.paragraphs ?? []) {
      for (const sentence of paragraph.sentences ?? []) {
        for (const { t, lemma, pos } of sentence.tokens ?? []) {
          if (lemma && pos) words.push({ t, lemma, pos, file });
        }
      }
    }
  }
  return words;
}
