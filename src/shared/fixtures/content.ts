import type {
  Chapter,
  Course,
  Deck,
  Grammar,
  GrammarNote,
  Paragraph,
  Sentence,
  Text,
  WordToken,
} from '../schemas';

// Dummy data mirroring the mockups. PDF chapter ranges follow PLAN §2; section pages and week
// ranges are made up (the real ones come from T-07). The French is original.

type Annotation = Omit<WordToken, 't'>;
type Annotations = Record<string, Annotation>;

/** Splits a sentence into word and gap tokens and annotates each word by its lowercase form. */
function sentence(fr: string, en: string, words: Annotations): Sentence {
  const tokens = fr
    .split(/(\p{L}+)/u)
    .filter((piece) => piece.length > 0)
    .map((piece) => {
      if (!/\p{L}/u.test(piece)) return { t: piece };
      const annotation = words[piece.toLowerCase()];
      if (!annotation) throw new Error(`Fixture word "${piece}" has no annotation`);
      return { t: piece, ...annotation };
    });
  return { tokens, en };
}

function paragraph(words: Annotations, ...sentences: [fr: string, en: string][]): Paragraph {
  return { sentences: sentences.map(([fr, en]) => sentence(fr, en, words)) };
}

const ilElleEr = 'il / elle · present · -er verb';
const jeEr = 'je · present · -er verb';

const leaWords: Annotations = {
  léa: { lemma: 'Léa', pos: 'name', gloss: 'Léa (a name)' },
  habite: { lemma: 'habiter', pos: 'verb', gloss: 'lives', form: ilElleEr },
  à: { lemma: 'à', pos: 'preposition', gloss: 'in, at, to' },
  lyon: { lemma: 'Lyon', pos: 'name', gloss: 'Lyon (a city in France)' },
  elle: {
    lemma: 'elle',
    pos: 'pronoun',
    gloss: 'she',
    form: 'subject pronoun · 3rd person singular',
  },
  a: { lemma: 'avoir', pos: 'verb', gloss: 'has', form: 'il / elle · present · irregular' },
  un: { lemma: 'un', pos: 'article', gender: 'm', gloss: 'a, an', form: 'indefinite article' },
  petit: {
    lemma: 'petit',
    pos: 'adjective',
    gender: 'm',
    gloss: 'small, little',
    form: 'feminine: petite',
  },
  appartement: { lemma: 'appartement', pos: 'noun', gender: 'm', gloss: 'apartment, flat' },
  et: { lemma: 'et', pos: 'conjunction', gloss: 'and' },
  chat: { lemma: 'chat', pos: 'noun', gender: 'm', gloss: 'cat' },
  le: { lemma: 'le', pos: 'article', gender: 'm', gloss: 'the', form: 'definite article' },
  matin: {
    lemma: 'matin',
    pos: 'noun',
    gender: 'm',
    gloss: 'morning',
    form: 'le matin = in the morning',
  },
  mange: { lemma: 'manger', pos: 'verb', gloss: 'eats', form: ilElleEr },
  une: { lemma: 'un', pos: 'article', gender: 'f', gloss: 'a, an', form: 'indefinite article' },
  tartine: {
    lemma: 'tartine',
    pos: 'noun',
    gender: 'f',
    gloss: 'slice of bread with butter or jam',
    isNew: true,
  },
  écoute: { lemma: 'écouter', pos: 'verb', gloss: 'listens to', form: ilElleEr, isNew: true },
  la: { lemma: 'le', pos: 'article', gender: 'f', gloss: 'the', form: 'definite article' },
  radio: { lemma: 'radio', pos: 'noun', gender: 'f', gloss: 'radio' },
  parle: { lemma: 'parler', pos: 'verb', gloss: 'talks', form: ilElleEr },
  avec: { lemma: 'avec', pos: 'preposition', gloss: 'with' },
  son: {
    lemma: 'son',
    pos: 'possessive',
    gender: 'm',
    gloss: 'her',
    form: 'before a masculine noun (sa before feminine)',
  },
  voisin: {
    lemma: 'voisin',
    pos: 'noun',
    gender: 'm',
    gloss: 'neighbor',
    form: 'feminine: voisine',
    isNew: true,
  },
  karim: { lemma: 'Karim', pos: 'name', gloss: 'Karim (a name)' },
  il: { lemma: 'il', pos: 'pronoun', gloss: 'he', form: 'subject pronoun · 3rd person singular' },
  aime: { lemma: 'aimer', pos: 'verb', gloss: 'likes', form: ilElleEr },
  café: { lemma: 'café', pos: 'noun', gender: 'm', gloss: 'coffee' },
  mais: { lemma: 'mais', pos: 'conjunction', gloss: 'but' },
  préfère: {
    lemma: 'préférer',
    pos: 'verb',
    gloss: 'prefers',
    form: 'il / elle · present · é becomes è before a silent ending',
    isNew: true,
  },
  thé: { lemma: 'thé', pos: 'noun', gender: 'm', gloss: 'tea' },
  huit: { lemma: 'huit', pos: 'number', gloss: 'eight' },
  heures: {
    lemma: 'heure',
    pos: 'noun',
    gender: 'f',
    gloss: 'o’clock',
    form: 'plural · à huit heures = at eight o’clock',
    isNew: true,
  },
  va: { lemma: 'aller', pos: 'verb', gloss: 'goes', form: 'il / elle · present · irregular' },
  au: { lemma: 'au', pos: 'contraction', gloss: 'to the', form: 'à + le becomes au' },
  travail: { lemma: 'travail', pos: 'noun', gender: 'm', gloss: 'work', isNew: true },
};

/** "Le matin de Léa" from `Reader.dc.html`, fully annotated. */
export const leaMorningText: Text = {
  id: 'ch10-le-matin-de-lea',
  chapterId: 'ch10',
  title: 'Le matin de Léa',
  kind: 'story',
  minutes: 2,
  paragraphs: [
    paragraph(
      leaWords,
      ['Léa habite à Lyon.', 'Léa lives in Lyon.'],
      ['Elle a un petit appartement et un chat.', 'She has a small apartment and a cat.'],
    ),
    paragraph(leaWords, [
      'Le matin, elle mange une tartine et elle écoute la radio.',
      'In the morning, she eats a slice of bread and jam and listens to the radio.',
    ]),
    paragraph(
      leaWords,
      ['Elle parle avec son voisin, Karim.', 'She talks with her neighbor, Karim.'],
      ['Il aime le café, mais Léa préfère le thé.', 'He likes coffee, but Léa prefers tea.'],
    ),
    paragraph(leaWords, [
      'À huit heures, elle va au travail.',
      'At eight o’clock, she goes to work.',
    ]),
  ],
  newWords: ['tartine', 'écouter', 'voisin', 'préférer', 'heure', 'travail'],
  // The mockup text uses a number (Ch 4) before Ch 4 in the route; kept as drawn.
  grammarTags: [
    'articles.definite',
    'articles.indefinite',
    'avoir.present',
    'aller.present',
    'er.present',
    'numbers.0-100',
  ],
};

const cafeWords: Annotations = {
  bonjour: { lemma: 'bonjour', pos: 'interjection', gloss: 'hello' },
  léa: leaWords['léa'],
  karim: leaWords['karim'],
  je: { lemma: 'je', pos: 'pronoun', gloss: 'I', form: 'subject pronoun · 1st person singular' },
  mange: { lemma: 'manger', pos: 'verb', gloss: 'am eating', form: jeEr },
  un: leaWords['un'],
  croissant: { lemma: 'croissant', pos: 'noun', gender: 'm', gloss: 'croissant', isNew: true },
  moi: { lemma: 'moi', pos: 'pronoun', gloss: 'me', form: 'stressed pronoun' },
  préfère: {
    lemma: 'préférer',
    pos: 'verb',
    gloss: 'prefer',
    form: 'je · present · é becomes è before a silent ending',
  },
  une: leaWords['une'],
  tartine: {
    lemma: 'tartine',
    pos: 'noun',
    gender: 'f',
    gloss: 'slice of bread with butter or jam',
  },
};

/** A short dialogue standing in for "Au café" on the chapter page. */
export const cafeDialogueText: Text = {
  id: 'ch10-au-cafe',
  chapterId: 'ch10',
  title: 'Au café',
  kind: 'dialogue',
  minutes: 1,
  paragraphs: [
    { speaker: 'Karim', ...paragraph(cafeWords, ['Bonjour, Léa\u00a0!', 'Hi, Léa!']) },
    {
      speaker: 'Léa',
      ...paragraph(
        cafeWords,
        ['Bonjour, Karim.', 'Hi, Karim.'],
        ['Je mange un croissant.', 'I’m eating a croissant.'],
      ),
    },
    {
      speaker: 'Karim',
      ...paragraph(cafeWords, [
        'Moi, je préfère une tartine.',
        'Me, I prefer a slice of bread and jam.',
      ]),
    },
  ],
  newWords: ['croissant'],
  grammarTags: ['articles.indefinite', 'er.present'],
};

export const texts: Text[] = [leaMorningText, cafeDialogueText];

function chapter(
  id: string,
  number: string,
  title: string,
  shortTitle: string,
  pdf: [number, number],
  weeks: [number, number],
  kind: Chapter['kind'] = 'grammar',
): Chapter {
  return {
    id,
    number,
    title,
    shortTitle,
    kind,
    pdfStart: pdf[0],
    pdfEnd: pdf[1],
    weekStart: weeks[0],
    weekEnd: weeks[1],
    sections: [],
  };
}

const ch10: Chapter = {
  ...chapter('ch10', '10', 'Present tense of -er verbs', '-er verbs', [185, 196], [5, 5]),
  sections: [
    { label: 'Section 1', pdfStart: 185, pdfEnd: 187 },
    { label: 'Section 2', pdfStart: 188, pdfEnd: 190 },
    { label: 'Section 3', pdfStart: 191, pdfEnd: 193 },
    { label: 'Section 4', pdfStart: 194, pdfEnd: 196 },
  ],
};

/** Stage 1 only, in the beginner route order of `Onboarding.dc.html` and `Path.dc.html`. */
export const course: Course = {
  stages: [
    {
      id: 'stage1',
      number: 1,
      title: 'Foundations',
      level: 'A1',
      weekStart: 1,
      weekEnd: 8,
      chapters: [
        chapter('appA', 'A', 'Pronunciation', 'Sounds', [564, 571], [1, 8], 'appendix'),
        chapter('ch1', '1', 'Articles', 'Articles', [12, 23], [1, 1]),
        chapter('ch2', '2', 'Basic gender endings', 'Gender', [24, 47], [2, 2]),
        chapter('ch12', '12', 'Être, avoir, irregular verbs', 'Être, avoir', [208, 221], [3, 4]),
        ch10,
        chapter('ch4', '4', 'Numbers', 'Numbers', [89, 97], [6, 6]),
        chapter('ch7', '7', 'Asking questions', 'Questions', [140, 159], [7, 7]),
        chapter(
          'ch33',
          '33',
          'Conversation: meeting people',
          'Meeting people',
          [489, 501],
          [8, 8],
          'conversation',
        ),
      ],
    },
  ],
};

export const grammar: Grammar = [
  { id: 'articles.definite', label: 'Definite articles: le, la, l’, les', chapterId: 'ch1' },
  { id: 'articles.indefinite', label: 'Indefinite articles: un, une, des', chapterId: 'ch1' },
  { id: 'gender.basic', label: 'Noun gender from common endings', chapterId: 'ch2' },
  { id: 'etre.present', label: 'être in the present', chapterId: 'ch12' },
  { id: 'avoir.present', label: 'avoir in the present', chapterId: 'ch12' },
  { id: 'aller.present', label: 'aller in the present', chapterId: 'ch12' },
  { id: 'faire.present', label: 'faire in the present', chapterId: 'ch12' },
  { id: 'er.present', label: 'Regular -er verbs in the present', chapterId: 'ch10' },
  { id: 'numbers.0-100', label: 'Numbers 0 to 100', chapterId: 'ch4' },
  { id: 'questions.intonation', label: 'Questions by intonation', chapterId: 'ch7' },
  { id: 'questions.est-ce-que', label: 'Questions with est-ce que', chapterId: 'ch7' },
];

/** The three cards of `Review.dc.html`, as a starter deck. */
export const ch10Deck: Deck = {
  chapterId: 'ch10',
  cards: [
    {
      id: 'ch10-elle-ecoute-la-radio',
      type: 'sentence_meaning',
      front: 'Elle écoute la radio.',
      back: 'She listens to the radio.',
      note: 'écouter = to listen to. No extra word for “to”.',
      textId: 'ch10-le-matin-de-lea',
    },
    {
      id: 'ch10-nous-parlons-francais',
      type: 'cloze',
      front: 'Nous ___ français à la maison.',
      back: 'Nous parlons français à la maison.',
      clozeAnswer: 'parlons',
      hint: 'parler · We speak French at home.',
      note: 'nous takes the -ons ending.',
    },
    {
      id: 'ch10-j-ai-un-chat',
      type: 'meaning_sentence',
      front: 'I have a cat and a small apartment.',
      back: 'J’ai un chat et un petit appartement.',
      note: 'je + ai becomes j’ai.',
    },
  ],
};

/** The "Pattern" card of `Chapter.dc.html`. */
export const ch10Note: GrammarNote = {
  chapterId: 'ch10',
  title: 'parler',
  subtitle: 'to speak',
  rows: [
    { label: 'je', fr: 'parle', ending: 'e' },
    { label: 'tu', fr: 'parles', ending: 'es' },
    { label: 'il / elle', fr: 'parle', ending: 'e' },
    { label: 'nous', fr: 'parlons', ending: 'ons' },
    { label: 'vous', fr: 'parlez', ending: 'ez' },
    { label: 'ils / elles', fr: 'parlent', ending: 'ent' },
  ],
  tip: '-e, -es, -e and -ent sound the same. Only nous and vous change the sound.',
};
