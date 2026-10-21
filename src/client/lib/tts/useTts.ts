import { useCallback, useEffect, useRef, useState } from 'react';
import {
  frenchVoices,
  isSupported,
  speak as speakText,
  stop as stopSpeech,
  type SpeakOptions,
} from './speech';

export function useTts() {
  const supported = isSupported();
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const current = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(frenchVoices(synth.getVoices()));
    load();
    // Chrome and Safari fill the voice list after the first call.
    synth.addEventListener('voiceschanged', load);
    return () => {
      synth.removeEventListener('voiceschanged', load);
      current.current += 1;
      stopSpeech();
    };
  }, [supported]);

  const speak = useCallback((text: string, options?: SpeakOptions) => {
    const id = ++current.current;
    setSpeaking(true);
    return speakText(text, options).finally(() => {
      // A newer speak() or stop() owns the state now.
      if (current.current === id) setSpeaking(false);
    });
  }, []);

  const stop = useCallback(() => {
    current.current += 1;
    stopSpeech();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, supported, voices };
}
