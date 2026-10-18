import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampRate, DEFAULT_RATE, pickVoice, speak } from './speech';

const voice = (voiceURI: string, lang: string, localService: boolean) =>
  ({ voiceURI, name: voiceURI, lang, localService, default: false }) as SpeechSynthesisVoice;

class FakeUtterance {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onboundary: ((e: { name: string; charIndex: number; charLength?: number }) => void) | null = null;
  constructor(public text: string) {}
}

describe('clampRate', () => {
  it('defaults to 0.8 and clamps to 0.6-1.0', () => {
    expect(clampRate(undefined)).toBe(DEFAULT_RATE);
    expect(clampRate(0.1)).toBe(0.6);
    expect(clampRate(2)).toBe(1);
    expect(clampRate(0.7)).toBe(0.7);
  });
});

describe('pickVoice', () => {
  const enUS = voice('en', 'en-US', true);
  const frCA = voice('ca', 'fr-CA', true);
  const frFRNet = voice('net', 'fr-FR', false);
  const frFRLocal = voice('local', 'fr-FR', true);

  it('prefers the saved voice', () => {
    expect(pickVoice([frFRLocal, frCA], 'ca')).toBe(frCA);
  });
  it('falls back to local fr-FR, then any fr-FR, then any fr-*', () => {
    expect(pickVoice([enUS, frCA, frFRNet, frFRLocal])).toBe(frFRLocal);
    expect(pickVoice([enUS, frCA, frFRNet])).toBe(frFRNet);
    expect(pickVoice([enUS, frCA])).toBe(frCA);
  });
  it('ignores an unknown saved voice and returns undefined without French', () => {
    expect(pickVoice([frFRLocal], 'gone')).toBe(frFRLocal);
    expect(pickVoice([enUS])).toBeUndefined();
  });
});

describe('speak', () => {
  const spoken: FakeUtterance[] = [];
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn((u: FakeUtterance) => spoken.push(u)),
    getVoices: vi.fn((): SpeechSynthesisVoice[] => []),
  };

  beforeEach(() => {
    spoken.length = 0;
    synth.getVoices.mockReturnValue([]);
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('cancels first, uses the chosen voice and a clamped rate', () => {
    const fr = voice('fr', 'fr-FR', true);
    synth.getVoices.mockReturnValue([fr]);
    void speak('Bonjour', { rate: 5 });
    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak);
    expect(spoken[0]).toMatchObject({ text: 'Bonjour', rate: 1, voice: fr, lang: 'fr-FR' });
  });

  it('uses voices that loaded late', () => {
    void speak('a');
    expect(spoken[0]?.voice).toBeNull();
    synth.getVoices.mockReturnValue([voice('fr', 'fr-FR', true)]);
    void speak('b');
    expect(spoken[1]?.voice?.voiceURI).toBe('fr');
  });

  it('resolves on end and forwards only sentence boundaries', async () => {
    const onSentence = vi.fn();
    const done = speak('Un. Deux.', { onSentence });
    const u = spoken[0];
    u?.onboundary?.({ name: 'word', charIndex: 0 });
    u?.onboundary?.({ name: 'sentence', charIndex: 4, charLength: 5 });
    u?.onend?.();
    await done;
    expect(onSentence).toHaveBeenCalledExactlyOnceWith({ charIndex: 4, charLength: 5 });
  });

  it('is a no-op when unsupported', async () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
    await expect(speak('Bonjour')).resolves.toBeUndefined();
  });
});
