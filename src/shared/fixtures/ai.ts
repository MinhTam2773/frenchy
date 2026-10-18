import type {
  ExplainRequest,
  ExplainResponse,
  TranslateRequest,
  TranslateResponse,
} from '../schemas';

const sentence = 'Il aime le café, mais Léa préfère le thé.';

export const translateRequest: TranslateRequest = { text: sentence };

export const translateResponse: TranslateResponse = {
  translation: 'He likes coffee, but Léa prefers tea.',
};

export const explainRequest: ExplainRequest = { sentence, chapterId: 'ch10' };

/** `Sentence.dc.html`. */
export const explainResponse: ExplainResponse = {
  translation: 'He likes coffee, but Léa prefers tea.',
  gloss: [
    { fr: 'Il', en: 'he' },
    { fr: 'aime', en: 'likes' },
    { fr: 'le café', en: 'coffee' },
    { fr: 'mais', en: 'but' },
    { fr: 'Léa', en: 'Léa' },
    { fr: 'préfère', en: 'prefers' },
    { fr: 'le thé', en: 'tea' },
  ],
  notes: [
    'French keeps the article for likes and dislikes: aimer le café means "to like coffee" in general.',
    'préférer changes é to è before a silent ending: je préfère, but nous préférons.',
  ],
};
