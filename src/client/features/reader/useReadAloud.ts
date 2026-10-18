import { useCallback, useEffect, useRef, useState } from 'react';
import { useTts } from '@client/lib/tts/useTts';

type Voice = { rate: number; voiceURI: string | null };

/**
 * Reads the text one sentence per utterance, so the sentence being read is always known and can
 * be highlighted (engines rarely report `sentence` boundaries, L-15). Pause keeps the place.
 */
export function useReadAloud(sentences: readonly string[], voice: Voice) {
  const { speak, stop, supported } = useTts();
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);
  // Read at each sentence start, so a speed change applies from the next sentence.
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  });
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const options = () => ({
    rate: voiceRef.current.rate,
    voiceURI: voiceRef.current.voiceURI ?? undefined,
  });

  async function playFrom(from: number) {
    const id = ++run.current;
    setPlaying(true);
    for (let i = from; i < sentences.length; i++) {
      setCurrent(i);
      await speak(sentences[i], options());
      // Paused, or another play started: that one owns the state now.
      if (run.current !== id) return;
    }
    setPlaying(false);
    setCurrent(null);
  }

  const pause = useCallback(() => {
    run.current += 1;
    stop();
    setPlaying(false);
  }, [stop]);

  function toggle() {
    if (playing) pause();
    else void playFrom(current ?? 0);
  }

  /** Speaks one word or sentence, pausing the read-aloud first. */
  function say(text: string, rate?: number) {
    pause();
    void speak(text, { ...options(), ...(rate === undefined ? {} : { rate }) });
  }

  return { supported, playing, current, toggle, say };
}
