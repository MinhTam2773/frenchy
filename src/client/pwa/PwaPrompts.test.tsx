import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PwaPrompts, HINT_SEEN_KEY } from './PwaPrompts';
import { UpdateToast } from './UpdateToast';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

beforeEach(() => {
  localStorage.clear();
  window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('shows the iOS hint once, then remembers the dismissal', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI);
  const first = render(<PwaPrompts />);
  expect(screen.getByRole('region', { name: 'Install Frenchy' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.queryByRole('region', { name: 'Install Frenchy' })).not.toBeInTheDocument();
  expect(localStorage.getItem(HINT_SEEN_KEY)).toBe('1');

  first.unmount();
  render(<PwaPrompts />);
  expect(screen.queryByRole('region', { name: 'Install Frenchy' })).not.toBeInTheDocument();
});

test('shows nothing outside iOS Safari', () => {
  const { container } = render(<PwaPrompts />);
  expect(container).toBeEmptyDOMElement();
});

test('the update toast offers reload and later', () => {
  const onReload = vi.fn();
  const onDismiss = vi.fn();
  render(<UpdateToast onReload={onReload} onDismiss={onDismiss} />);
  expect(screen.getByRole('status')).toHaveTextContent('A new version of Frenchy is ready.');

  fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
  fireEvent.click(screen.getByRole('button', { name: 'Later' }));
  expect(onReload).toHaveBeenCalledOnce();
  expect(onDismiss).toHaveBeenCalledOnce();
});
