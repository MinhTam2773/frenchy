import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ch10Note } from '@shared/fixtures';
import { PatternCard } from './PatternCard';

const speak = vi.fn(() => Promise.resolve());
const tts = { supported: true };

vi.mock('@client/lib/tts/useTts', () => ({
  useTts: () => ({ speak, stop: vi.fn(), speaking: false, voices: [], supported: tts.supported }),
}));

beforeEach(() => {
  speak.mockClear();
  tts.supported = true;
});

test('plays the French forms at the saved rate and voice', () => {
  render(<PatternCard note={ch10Note} voice={{ voiceURI: 'fr-voice', rate: 0.7 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play parler' }));
  expect(speak).toHaveBeenCalledWith('parle. parles. parle. parlons. parlez. parlent', {
    rate: 0.7,
    voiceURI: 'fr-voice',
  });
});

test('lets the device pick the voice when none is saved', () => {
  render(<PatternCard note={ch10Note} voice={{ voiceURI: null, rate: 0.8 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play parler' }));
  expect(speak).toHaveBeenCalledWith(expect.any(String), { rate: 0.8, voiceURI: undefined });
});

test('has no play button where speech is not supported', () => {
  tts.supported = false;
  render(<PatternCard note={ch10Note} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('fills the two columns top to bottom and tags the forms as French', () => {
  const { container } = render(<PatternCard note={ch10Note} />);
  const list = container.querySelector('dl');
  expect(list).toHaveAttribute('lang', 'fr');
  expect(list).toHaveStyle({ gridTemplateRows: 'repeat(3, auto)' });
});
