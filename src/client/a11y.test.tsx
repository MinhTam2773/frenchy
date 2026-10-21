import { fireEvent, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { expect, test, vi } from 'vitest';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { leaMorningText } from '@shared/fixtures';

// Whole-app renders; a busy machine needs the room (L-74).
vi.setConfig({ testTimeout: 30_000 });

// Fixed text, like the reader's own test (L-75).
vi.mock('@shared/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/content')>();
  const { texts: fixtureTexts } = await import('@shared/fixtures');
  return {
    ...actual,
    loadText: async (id: string) => fixtureTexts.find((t) => t.id === id),
    getChapterTextIds: (chapterId: string) =>
      fixtureTexts.filter((t) => t.chapterId === chapterId).map((t) => t.id),
  };
});

vi.mock('@client/lib/tts/useTts', () => ({
  useTts: () => ({
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    speaking: false,
    supported: true,
    voices: [],
  }),
}));

/**
 * axe in jsdom checks structure: names, roles, labels, landmarks, headings, ARIA, `lang`.
 * It cannot lay anything out, so contrast and reflow are covered by `contrast.test.ts` (token
 * pairs) and by `e2e/a11y.spec.ts` (real browser, axe with colour contrast, all routes).
 */
async function expectNoViolations() {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: {
      'color-contrast': { enabled: false },
      // A page-level rule; the sheet and panel states are checked as part of their page.
      region: { enabled: false },
    },
  });
  const summary = result.violations.map(
    (v) => `${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')}`).join('\n')}`,
  );
  expect(summary).toEqual([]);
}

const signedOutRoutes = [
  ['welcome', '/', 'frenchy'],
  ['sign up', '/sign-up', 'Create your account'],
  ['sign in', '/sign-in', 'Welcome back'],
  ['not found', '/nope', 'Page not found'],
] as const;

test.each(signedOutRoutes)('%s has no axe violations', async (_name, path, heading) => {
  setMockSignedIn(false);
  renderAt(path);
  await screen.findByRole('heading', { name: heading });
  await expectNoViolations();
});

const signedInRoutes = [
  ['today', '/today', /Bonjour/],
  ['path', '/path', 'Your path'],
  ['chapter', '/chapter/ch10', null],
  ['practice', '/practice', 'Practice'],
  ['me', '/me', 'Me'],
  ['streak', '/streak', 'Streak'],
  ['onboarding', '/onboarding', null],
] as const;

test.each(signedInRoutes)('%s has no axe violations', async (_name, path, heading) => {
  renderAt(path);
  if (heading) await screen.findByRole('heading', { name: heading }, { timeout: 5000 });
  else await screen.findAllByRole('heading', {}, { timeout: 5000 });
  // Today and Practice load several queries; wait for their numbers before judging the page.
  await screen.findAllByRole(path === '/onboarding' ? 'button' : 'link');
  await expectNoViolations();
});

test('the reader, its word sheet and its sentence sheet have no axe violations', async () => {
  renderAt(`/read/${leaMorningText.id}`);
  await screen.findByRole('heading', { name: 'Le matin de Léa' });
  await expectNoViolations();

  const article = screen.getByRole('article');
  fireEvent.click(within(article).getAllByRole('button')[0] as HTMLElement);
  await screen.findByRole('region', { name: 'Word details' });
  await expectNoViolations();

  fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));
  await screen.findByRole('dialog');
  await expectNoViolations();
});

test('the review card, front and back, has no axe violations', async () => {
  renderAt('/review');
  await screen.findByRole('button', { name: 'Show answer' });
  await expectNoViolations();
  fireEvent.click(await screen.findByRole('button', { name: 'Show answer' }));
  await screen.findByRole('button', { name: /^Good,/ });
  await expectNoViolations();
});

test('the review card with an open word sheet has no axe violations', async () => {
  renderAt('/review');
  fireEvent.click(await screen.findByRole('button', { name: 'écoute' }));
  const sheet = await screen.findByRole('region', { name: 'Word details' });
  await within(sheet).findByText(/listen/, {}, { timeout: 20_000 });
  await expectNoViolations();
});

test('the stage picker sheet has no axe violations', async () => {
  renderAt('/path');
  fireEvent.click(await screen.findByRole('button', { name: 'Choose stage' }));
  await screen.findByRole('dialog', { name: 'Choose stage' });
  await expectNoViolations();
});
