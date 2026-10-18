import type { WordStatus } from '../schemas';

/** The list in `Words.dc.html`. */
export const words: WordStatus[] = [
  { lemma: 'tartine', status: 'new' },
  { lemma: 'voisin', status: 'new' },
  { lemma: 'préférer', status: 'new' },
  { lemma: 'écouter', status: 'learning' },
  { lemma: 'heure', status: 'learning' },
  { lemma: 'travail', status: 'learning' },
  { lemma: 'parler', status: 'known' },
  { lemma: 'maison', status: 'known' },
  { lemma: 'chat', status: 'known' },
  { lemma: 'avoir', status: 'known' },
  { lemma: 'radio', status: 'known' },
  { lemma: 'café', status: 'known' },
];
