import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTts } from './useTts';

const fr = {
  voiceURI: 'fr',
  name: 'fr',
  lang: 'fr-FR',
  localService: true,
  default: false,
} as SpeechSynthesisVoice;
const en = {
  voiceURI: 'en',
  name: 'en',
  lang: 'en-US',
  localService: true,
  default: false,
} as SpeechSynthesisVoice;

class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

describe('useTts', () => {
  const spoken: FakeUtterance[] = [];
  let voices: SpeechSynthesisVoice[];
  const target = new EventTarget();
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn((u: FakeUtterance) => spoken.push(u)),
    getVoices: () => voices,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };

  beforeEach(() => {
    spoken.length = 0;
    voices = [];
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('reports supported=false cleanly where there is no Web Speech', async () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
    const { result } = renderHook(() => useTts());
    expect(result.current).toMatchObject({ supported: false, speaking: false, voices: [] });
    await act(() => result.current.speak('Bonjour'));
    expect(result.current.speaking).toBe(false);
  });

  it('picks up French voices that load late', () => {
    const { result } = renderHook(() => useTts());
    expect(result.current.voices).toEqual([]);
    voices = [en, fr];
    act(() => {
      target.dispatchEvent(new Event('voiceschanged'));
    });
    expect(result.current.voices).toEqual([fr]);
  });

  it('tracks speaking and clears it on end or stop', async () => {
    const { result } = renderHook(() => useTts());
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.speak('Bonjour');
    });
    expect(result.current.speaking).toBe(true);
    await act(async () => {
      spoken[0]?.onend?.();
      await done;
    });
    expect(result.current.speaking).toBe(false);

    act(() => {
      void result.current.speak('Salut');
    });
    expect(result.current.speaking).toBe(true);
    act(() => result.current.stop());
    expect(result.current.speaking).toBe(false);
  });

  it('keeps speaking=true when a newer utterance replaces an interrupted one', async () => {
    const { result } = renderHook(() => useTts());
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.speak('un');
    });
    act(() => {
      void result.current.speak('deux');
    });
    await act(async () => {
      spoken[0]?.onerror?.();
      await first;
    });
    expect(result.current.speaking).toBe(true);
  });
});
