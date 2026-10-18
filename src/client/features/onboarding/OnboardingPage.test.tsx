import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { getCourse } from '@shared/content';
import { api } from '@client/lib/api';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

const stages = getCourse().stages;

async function openOnboarding() {
  renderAt('/onboarding');
  await screen.findByRole('heading', { name: 'Which chapter are you on in the book?' });
}

test('lists Stage 1 chapters in book order, then offers later stages', async () => {
  await openOnboarding();
  const stage1 = screen.getByRole('region', { name: /Stage 1 · Foundations/ });
  const rows = within(stage1).getAllByRole('button');
  expect(rows).toHaveLength(stages[0]?.chapters.length ?? -1);
  expect(rows[0]).toHaveAccessibleName('Appendix A: Pronunciation');
  expect(rows[1]).toHaveAccessibleName('Chapter 1: Articles');
  expect(screen.queryByRole('region', { name: /Stage 2/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Show later stages' }));
  for (const stage of stages.slice(1)) {
    expect(
      screen.getByRole('region', { name: `Stage ${stage.number} · ${stage.title}` }),
    ).toBeInTheDocument();
  }
  expect(screen.queryByRole('button', { name: 'Show later stages' })).not.toBeInTheDocument();
});

test('starts on the first real chapter and a 30 minute goal', async () => {
  await openOnboarding();
  expect(screen.getByRole('button', { name: 'Chapter 1: Articles' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toBeInTheDocument();
});

test('picks one chapter and one goal at a time', async () => {
  await openOnboarding();
  fireEvent.click(screen.getByRole('button', { name: 'Chapter 2: Basic gender endings' }));
  fireEvent.click(screen.getByRole('button', { name: '45 min' }));
  expect(screen.getByRole('button', { name: 'Chapter 2: Basic gender endings' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Chapter 1: Articles' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'false');
});

test('Start learning saves the chapter, goal and time zone, then opens Today', async () => {
  await openOnboarding();
  fireEvent.click(screen.getByRole('button', { name: 'Show later stages' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chapter 20: Subjunctive' }));
  fireEvent.click(screen.getByRole('button', { name: '60 min' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));

  expect(await screen.findByRole('heading', { name: /Bonjour/ })).toBeInTheDocument();
  const saved = await api.profile.get();
  expect(saved.currentChapterId).toBe('ch20');
  expect(saved.dailyGoalMinutes).toBe(60);
  expect(saved.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test('a failed save is announced and can be retried', async () => {
  server.use(
    http.patch('/api/profile', () =>
      HttpResponse.json({ error: { code: 'bad_request', message: 'No' } }, { status: 400 }),
    ),
  );
  await openOnboarding();
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your choices.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start learning' })).toBeEnabled());
  expect(screen.queryByRole('heading', { name: /Bonjour/ })).not.toBeInTheDocument();
});
