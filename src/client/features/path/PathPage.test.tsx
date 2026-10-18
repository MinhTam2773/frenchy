/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configure, fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, test, vi } from 'vitest';
import { newProfile } from '@shared/fixtures';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';
import { contrastRatio } from '@client/ui/contrast';

// These render the whole app; give them room when CI or a busy machine is slow.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 15_000 });

async function findPath() {
  renderAt('/path');
  return screen.findByRole('link', { name: /^Chapter 10, .*, current$/ });
}

const linksEndingWith = (state: string) =>
  screen.getAllByRole('link', { name: new RegExp(`, ${state}$`) });

describe('course map', () => {
  test('shows the page inside the tab layout with the stage banner', async () => {
    await findPath();
    expect(screen.getByRole('heading', { name: 'Your path' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByText('Stage 1 · A1 · weeks 1–8')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundations' })).toBeInTheDocument();
    expect(screen.getByText('3 of 7 chapters done')).toBeInTheDocument();
  });

  test('draws done, current, locked and reference nodes from course.json and the profile', async () => {
    const current = await findPath();
    expect(current).toHaveAttribute('href', '/chapter/ch10');
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('You’re here')).toBeInTheDocument();

    expect(linksEndingWith('done').map((a) => a.getAttribute('href'))).toEqual([
      '/chapter/ch1',
      '/chapter/ch2',
      '/chapter/ch12',
    ]);
    // Locked chapters still open, read-only (G-07).
    expect(linksEndingWith('locked').map((a) => a.getAttribute('href'))).toEqual([
      '/chapter/ch4',
      '/chapter/ch7',
      '/chapter/ch33',
    ]);
    expect(linksEndingWith('reference').map((a) => a.getAttribute('href'))).toEqual([
      '/chapter/appA',
    ]);
  });

  test('names nodes like the mockup and labels them with the short title', async () => {
    await findPath();
    expect(screen.getByRole('link', { name: 'Chapter 1, Articles, done' })).toBeInTheDocument();
    expect(screen.getByText('Ch 2 · Gender')).toBeInTheDocument();
    expect(screen.getByText('App. A · Sounds')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByText('Ch 33 · Meeting people')).toBeInTheDocument();
  });

  test('the streak chip links to the streak screen', async () => {
    await findPath();
    const chip = await screen.findByRole('link', { name: '12 day streak' });
    expect(chip).toHaveAttribute('href', '/streak');
  });

  test('starts at the first real chapter before onboarding has picked one', async () => {
    server.use(http.get('/api/profile', () => HttpResponse.json(newProfile)));
    renderAt('/path');
    expect(
      await screen.findByRole('link', { name: 'Chapter 1, Articles, current' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 of 7 chapters done')).toBeInTheDocument();
  });

  test('a chapter outside stage 1 puts its stage on the map', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ ...newProfile, currentChapterId: 'ch6' })),
    );
    renderAt('/path');
    expect(
      await screen.findByRole('link', { name: /^Chapter 6, .*, current$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Getting around' })).toBeInTheDocument();
    expect(screen.getByText('2 of 9 chapters done')).toBeInTheDocument();
  });

  test('the stage switcher shows another stage, all locked, and can be closed with Escape', async () => {
    await findPath();
    fireEvent.click(screen.getByRole('button', { name: 'Choose stage' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose stage' });
    expect(within(dialog).getAllByRole('button')).toHaveLength(4);
    expect(within(dialog).getByRole('button', { name: /Foundations/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: /Getting around/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Getting around' })).toBeInTheDocument();
    expect(screen.getByText('Stage 2 · A1–A2 · weeks 9–18')).toBeInTheDocument();
    expect(screen.getByText('0 of 9 chapters done')).toBeInTheDocument();
    expect(linksEndingWith('locked')).toHaveLength(9);
    expect(screen.queryByText('You’re here')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Choose stage' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows an error with a retry when the profile cannot be loaded', async () => {
    server.use(http.get('/api/profile', () => HttpResponse.json({}, { status: 500 })));
    renderAt('/path');
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Could not load your path.',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  }, 10_000);
});

describe('done node colours', () => {
  // Vitest blanks CSS imports, so read the theme from disk (L-16).
  const styles = readFileSync(join(import.meta.dirname, '../../styles.css'), 'utf8');
  const hex = (name: string) => {
    const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(styles);
    if (!match?.[1]) throw new Error(`No --color-${name} token`);
    return match[1];
  };

  test('the check is ink on gold, which passes the 3:1 icon rule the mockup misses', async () => {
    const done =
      (await findPath()) && screen.getByRole('link', { name: 'Chapter 1, Articles, done' });
    expect(done).toHaveClass('bg-gold', 'text-ink');
    expect(contrastRatio(hex('surface'), hex('gold'))).toBeLessThan(3);
    expect(contrastRatio(hex('ink'), hex('gold'))).toBeGreaterThanOrEqual(4.5);
  });

  test('the locked icon and current star pass 3:1 too', () => {
    expect(contrastRatio(hex('muted'), hex('line'))).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(hex('surface'), hex('primary'))).toBeGreaterThanOrEqual(3);
  });
});
