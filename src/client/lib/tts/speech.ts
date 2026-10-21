export const DEFAULT_RATE = 0.8;
export const MIN_RATE = 0.6;
export const MAX_RATE = 1.0;

export interface SentenceBoundary {
  charIndex: number;
  charLength: number | undefined;
}

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  /** Fires only where the engine reports `sentence` boundaries (many report words only). */
  onSentence?: (boundary: SentenceBoundary) => void;
}

export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

export function clampRate(rate: number | undefined): number {
  if (rate === undefined || Number.isNaN(rate)) return DEFAULT_RATE;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
}

const normLang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
const isFrench = (v: SpeechSynthesisVoice) => normLang(v).startsWith('fr');
const isFrFR = (v: SpeechSynthesisVoice) => normLang(v) === 'fr-fr';

/** Saved voice, else local fr-FR, else any fr-FR, else local fr-*, else any fr-*. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  voiceURI?: string,
): SpeechSynthesisVoice | undefined {
  const saved = voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : undefined;
  if (saved) return saved;
  const french = voices.filter(isFrench);
  return (
    french.find((v) => isFrFR(v) && v.localService) ??
    french.find(isFrFR) ??
    french.find((v) => v.localService) ??
    french[0]
  );
}

export function frenchVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter(isFrench);
}

/** Cancels any utterance in progress, then speaks. Resolves when this utterance ends or is cut off. */
export function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isSupported() || text.trim() === '') return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = clampRate(options.rate);
  const voice = pickVoice(synth.getVoices(), options.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  const { onSentence } = options;
  if (onSentence) {
    utterance.onboundary = (e) => {
      if (e.name === 'sentence') onSentence({ charIndex: e.charIndex, charLength: e.charLength });
    };
  }
  return new Promise((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stop(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}
