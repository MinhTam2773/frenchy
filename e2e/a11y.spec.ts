/// <reference lib="dom" />
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

// T-28. axe in a real browser (so colour contrast is checked) on every route and on the sheets,
// at phone and desktop width, plus two layout checks axe does not make: no sideways scroll, and
// every button and link at least 44 px (inline links in a sentence are exempt).
// Self-contained on purpose: only `@playwright/test` and `axe-core`, no helpers from other specs.

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const MIN_TARGET = 44;

type Axe = {
  run: (context: Document, options: unknown) => Promise<{ violations: AxeViolation[] }>;
};
type AxeViolation = {
  id: string;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
};

async function expectAccessible(page: Page, name: string) {
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: Axe }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations;
  }, TAGS);
  const summary = violations.map(
    (v) => `${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')}`).join('\n')}`,
  );
  expect(summary, `axe on ${name}`).toEqual([]);

  const layout = await page.evaluate((min) => {
    const small: string[] = [];
    const targets = 'a[href], button, input:not([type=hidden]), select, textarea, [role=switch]';
    for (const el of document.querySelectorAll<HTMLElement>(targets)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || el.classList.contains('sr-only')) continue;
      // Words in the reader are text in a paragraph; they are the inline-link exemption.
      if (el.hasAttribute('data-token')) continue;
      if (box.width < min - 0.5 || box.height < min - 0.5) {
        const label = el.getAttribute('aria-label') ?? el.textContent ?? '';
        small.push(
          `${el.tagName.toLowerCase()} "${label.trim().slice(0, 30)}" ${box.width}x${box.height}`,
        );
      }
    }
    const sideways = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { small, sideways };
  }, MIN_TARGET);
  expect(layout.small, `targets under ${MIN_TARGET}px on ${name}`).toEqual([]);
  expect(layout.sideways, `sideways scroll on ${name}`).toBeLessThanOrEqual(0);
}

/** A fresh account per test, because every spec shares one local D1. */
async function signUp(page: Page, testInfo: { project: { name: string } }) {
  const stamp = `${Date.now()}-${testInfo.project.name}-${Math.floor(Math.random() * 1e6)}`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Continue with email' }).click();
  await page.getByLabel('Name').fill('A11y Learner');
  await page.getByLabel('Email').fill(`a11y-${stamp}@example.com`);
  await page.getByLabel('Password').fill('a11y-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('button', { name: 'Start learning' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // The Worker rate-limits sign-ups per client IP (5 a minute) and every spec shares localhost.
  const octet = () => 1 + Math.floor(Math.random() * 254);
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': `10.${octet()}.${octet()}.${octet()}` });
});

test('signed-out screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Continue with email' })).toBeVisible();
  await expectAccessible(page, 'welcome');

  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expectAccessible(page, 'sign in');

  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectAccessible(page, 'sign up with validation errors');

  await page.goto('/nope');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expectAccessible(page, 'not found');
});

test('every signed-in screen', async ({ page }, testInfo) => {
  // Eight pages, each loaded and scanned; a slow machine compiles every route on first visit.
  test.slow();
  await signUp(page, testInfo);
  await expectAccessible(page, 'onboarding');
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page).toHaveURL(/\/today$/);

  for (const [path, heading] of [
    ['/today', /Bonjour/],
    ['/path', 'Your path'],
    ['/practice', 'Practice'],
    ['/me', 'Me'],
    ['/streak', 'Streak'],
    ['/credits', 'Credits'],
  ] as const) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: heading, exact: typeof heading === 'string' }).first(),
    ).toBeVisible();
    // Cards load their numbers after the heading shows.
    await page.waitForLoadState('networkidle');
    await expectAccessible(page, path);
  }

  await page.goto('/path');
  await page.getByRole('button', { name: 'Choose stage' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose stage' })).toBeVisible();
  await expectAccessible(page, 'stage picker sheet');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/chapter/ch1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  await expectAccessible(page, 'chapter');
});

test('reader: word sheet and sentence sheet', async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto('/chapter/ch1');
  await page.getByRole('link', { name: /Au marché/ }).click();
  await expect(page.getByRole('button', { name: 'Finish reading' })).toBeVisible();
  await expectAccessible(page, 'reader');

  const firstWord = page.locator('[data-token]').first();
  await firstWord.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('region', { name: 'Word details' });
  await expect(panel).toBeVisible();
  await expectAccessible(page, 'reader with the word sheet');

  // The word sheet is not modal (L-99): focus stays on the word, Escape closes it and focus stays there.
  await expect(firstWord).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(firstWord).toBeFocused();

  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Sentence' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectAccessible(page, 'reader with the sentence sheet');

  // The sentence sheet is modal: Tab stays inside, Escape closes and gives focus back.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(
      true,
    );
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('review: front and back of a card', async ({ page }, testInfo) => {
  await signUp(page, testInfo);
  await page.goto('/chapter/ch1');
  await page.getByRole('button', { name: /Add to reviews/ }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Added \d+ to your reviews/ }),
  ).toBeVisible();

  await page.goto('/review');
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  await expectAccessible(page, 'review front');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('button', { name: /^Good/ })).toBeVisible();
  await expectAccessible(page, 'review back');
});
