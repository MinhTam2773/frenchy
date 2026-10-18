import { describe, expect, it } from 'vitest';
import { lookupForm, lookupLemma } from './lookup';

describe('lookupForm', () => {
  it('vais → aller, 1st person singular present indicative', async () => {
    const [first] = await lookupForm('vais');
    expect(first).toEqual({
      form: 'vais',
      lemma: 'aller',
      pos: 'verb',
      person: 1,
      number: 'sg',
      tense: 'present',
      mood: 'indicative',
    });
  });

  it('préfère → préférer, 1st and 3rd person singular present', async () => {
    const readings = await lookupForm('préfère');
    expect(readings[0]).toMatchObject({ lemma: 'préférer', pos: 'verb' });
    expect(readings).toContainEqual(
      expect.objectContaining({ person: 1, tense: 'present', mood: 'indicative' }),
    );
    expect(readings).toContainEqual(
      expect.objectContaining({ person: 3, tense: 'present', mood: 'indicative' }),
    );
  });

  it('heures → heure (f, pl)', async () => {
    expect(await lookupForm('heures')).toEqual([
      { form: 'heures', lemma: 'heure', pos: 'noun', number: 'pl', gender: 'f' },
    ]);
  });

  it("l' and l’ → the article le (m or f) first, then the pronouns le / la", async () => {
    const readings = await lookupForm('l’');
    expect(await lookupForm("l'")).toEqual(readings);
    expect(readings.slice(0, 2)).toEqual([
      { form: "l'", lemma: 'le', pos: 'article', number: 'sg', gender: 'm' },
      { form: "l'", lemma: 'le', pos: 'article', number: 'sg', gender: 'f' },
    ]);
    expect(readings.map((r) => `${r.lemma} ${r.pos}`)).toEqual(
      expect.arrayContaining(['le pronoun', 'la pronoun']),
    );
  });

  it('au = à + le', async () => {
    expect(await lookupForm('au')).toEqual([
      { form: 'au', lemma: 'au', pos: 'contraction', parts: ['à', 'le'] },
    ]);
  });

  it('puts the most frequent lexeme first (est → être before the noun "east")', async () => {
    const readings = await lookupForm('est');
    expect(readings[0]).toMatchObject({ lemma: 'être', person: 3 });
    expect(readings).toContainEqual(expect.objectContaining({ lemma: 'est', pos: 'noun' }));
  });

  it('ignores case and surrounding space', async () => {
    expect(await lookupForm(' Vais ')).toEqual(await lookupForm('vais'));
  });

  it('returns [] for unknown words, empty input and prototype keys', async () => {
    expect(await lookupForm('xqzw')).toEqual([]);
    expect(await lookupForm('')).toEqual([]);
    expect(await lookupForm('constructor')).toEqual([]);
    expect(await lookupForm('42')).toEqual([]);
  });
});

describe('lookupLemma', () => {
  it('returns glosses, gender and rank', async () => {
    const [heure] = await lookupLemma('heure');
    expect(heure).toMatchObject({ lemma: 'heure', pos: 'noun', gender: 'f' });
    expect(heure.glosses).toContain('hour, time');
    expect(heure.rank).toBeLessThan(500);
  });

  it('marks nouns used with either article as mf', async () => {
    expect(await lookupLemma('élève')).toContainEqual(
      expect.objectContaining({ pos: 'noun', gender: 'mf' }),
    );
  });
});
