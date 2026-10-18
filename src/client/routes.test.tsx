import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderAt } from './mocks/renderAt';

const tabRoutes = [
  ['/today', 'Today'],
  ['/path', 'Path'],
  ['/practice', 'Practice'],
  ['/words', 'Words'],
  ['/me', 'Me'],
] as const;

const fullScreenRoutes = [
  ['/', 'Welcome'],
  ['/onboarding', 'Onboarding'],
  ['/chapter/ch10', 'Chapter'],
  ['/read/ch10-le-matin-de-lea', 'Reader'],
  ['/review', 'Review'],
  ['/streak', 'Streak'],
] as const;

test.each(tabRoutes)('%s renders inside the tab layout', async (path, title) => {
  renderAt(path);
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
});

test.each(fullScreenRoutes)('%s renders inside the full-screen layout', async (path, title) => {
  renderAt(path);
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
});

test('/dev/ui shows the UI kit gallery in dev', async () => {
  renderAt('/dev/ui');
  expect(await screen.findByRole('heading', { name: 'UI kit' })).toBeInTheDocument();
});

test('an unknown path shows the not-found page', async () => {
  renderAt('/nope');
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});

test.each(tabRoutes)('the tab bar marks %s as the current tab', async (path, title) => {
  renderAt(path);
  await screen.findByRole('heading', { name: title });
  const current = screen.getAllByRole('link', { current: 'page' });
  expect(current).toHaveLength(1);
  expect(current[0]).toHaveAccessibleName(title);
});

test('tab links navigate without a page reload', async () => {
  renderAt('/today');
  fireEvent.click(await screen.findByRole('link', { name: 'Path' }));
  expect(await screen.findByRole('heading', { name: 'Path' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Path' })).toHaveAttribute('aria-current', 'page');
});
