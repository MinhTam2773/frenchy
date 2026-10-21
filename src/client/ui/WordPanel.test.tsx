import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { WordInfo } from '@shared/text';
import { WordPanel } from './WordPanel';

const info: WordInfo = {
  source: 'lexicon',
  word: 'écoute',
  lemma: 'écouter',
  pos: 'verb',
  glosses: ['to listen to', 'to hear'],
  form: 'il / elle · present',
  readings: [],
};

const base = { info, word: 'écoute', canSpeak: true, onPlay: vi.fn(), onClose: vi.fn() };

test('shows the word, its meaning and where it comes from, as a region and not a dialog', () => {
  render(<WordPanel {...base} />);
  expect(screen.getByRole('region', { name: 'Word details' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'écoute' })).toHaveAttribute('lang', 'fr');
  expect(screen.getByText('to listen to; to hear')).toBeInTheDocument();
  expect(screen.getByText('il / elle · present')).toBeInTheDocument();
  expect(screen.getByText('écouter')).toHaveAttribute('lang', 'fr');
});

test('offers Save word and Sentence only when the surface handles them', () => {
  const { rerender } = render(<WordPanel {...base} />);
  expect(screen.queryByRole('button', { name: 'Save word' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sentence' })).not.toBeInTheDocument();

  const onSave = vi.fn();
  const onSentence = vi.fn();
  rerender(<WordPanel {...base} onSave={onSave} onSentence={onSentence} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save word' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));
  expect(onSave).toHaveBeenCalledOnce();
  expect(onSentence).toHaveBeenCalledOnce();
});

test('plays and closes', () => {
  const onPlay = vi.fn();
  const onClose = vi.fn();
  render(<WordPanel {...base} onPlay={onPlay} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play pronunciation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close word details' }));
  expect(onPlay).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});

test('hides the play button when the browser cannot speak', () => {
  render(<WordPanel {...base} canSpeak={false} />);
  expect(screen.queryByRole('button', { name: 'Play pronunciation' })).not.toBeInTheDocument();
});

test('says so when the lookup failed, and not while the meaning is shown', () => {
  const { rerender } = render(<WordPanel {...base} info={undefined} lookupFailed />);
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t look this word up');
  rerender(<WordPanel {...base} lookupFailed />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('says there is no translation for an unknown word', () => {
  render(<WordPanel {...base} info={{ ...info, source: 'unknown', glosses: [] }} />);
  expect(screen.getByText('No translation yet')).toBeInTheDocument();
});
