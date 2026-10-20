/// <reference types="vite/client" />
import type { ContentFiles } from './validate';

/**
 * Everything under `content/` that `content:check` validates, eagerly; the lexicon is not part of
 * it. For tests and tooling only: app code that uses this bundles every lesson text (G-70).
 */
export const contentFiles: ContentFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob(
      ['../../../content/{course,grammar}.json', '../../../content/chapters/**/*.json'],
      { eager: true, import: 'default' },
    ),
  ).map(([key, value]) => [key.slice(key.indexOf('content/') + 'content/'.length), value]),
);
