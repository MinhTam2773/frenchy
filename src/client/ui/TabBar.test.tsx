import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TabBar } from './TabBar';

test('shows the five main tabs as links', () => {
  render(<TabBar current="/today" />);
  const nav = screen.getByRole('navigation', { name: 'Main' });
  expect(nav.querySelectorAll('a')).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'Words' })).toHaveAttribute('href', '/words');
});

test('marks only the current route with aria-current="page"', () => {
  render(<TabBar current="/path" />);
  expect(screen.getByRole('link', { name: 'Path' })).toHaveAttribute('aria-current', 'page');
  for (const name of ['Today', 'Practice', 'Words', 'Me']) {
    expect(screen.getByRole('link', { name })).not.toHaveAttribute('aria-current');
  }
});

test('a nested route keeps its tab current, a similar prefix does not', () => {
  const { rerender } = render(<TabBar current="/practice/review" />);
  expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');
  rerender(<TabBar current="/pathway" />);
  expect(screen.getByRole('link', { name: 'Path' })).not.toHaveAttribute('aria-current');
});
