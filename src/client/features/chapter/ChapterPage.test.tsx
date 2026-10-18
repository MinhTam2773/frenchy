import { configure, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';

// These render the whole app; give them room when CI or a busy machine is slow.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 15_000 });

// Chapters have no texts, note or deck until T-14 writes them, and T-14 will add them chapter by
// chapter. Pin "no content" here so these tests don't change when it lands; ChapterView.test.tsx
// covers the screen with content.
vi.mock('@shared/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/content')>()),
  getChapterTexts: () => [],
  getNote: () => undefined,
  getDeck: () => undefined,
}));

describe('chapter page', () => {
  test('shows the header, title and book pages in the full-screen layout', async () => {
    renderAt('/chapter/ch10');
    expect(
      await screen.findByRole('heading', { name: 'Present tense of -er verbs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Stage 1 · Chapter 10')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('Book: PDF p. 185–196')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to path' })).toHaveAttribute('href', '/path');
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  test('has no drill button yet (B-01)', async () => {
    renderAt('/chapter/ch10');
    await screen.findByRole('heading', { name: 'Present tense of -er verbs' });
    expect(screen.queryByText(/drill/i)).not.toBeInTheDocument();
  });

  test('an appendix is called an appendix', async () => {
    renderAt('/chapter/appA');
    expect(await screen.findByRole('heading', { name: 'Pronunciation' })).toBeInTheDocument();
    expect(screen.getByText('Stage 1 · Appendix A')).toBeInTheDocument();
  });

  test('a conversation chapter opens like any other', async () => {
    renderAt('/chapter/ch33');
    expect(
      await screen.findByRole('heading', { name: 'Conversation: meeting people' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Stage 1 · Chapter 33')).toBeInTheDocument();
  });

  test('an unknown chapter says so and links back to the path', async () => {
    renderAt('/chapter/ch99');
    expect(await screen.findByRole('heading', { name: 'Chapter not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to path' })).toHaveAttribute('href', '/path');
  });

  test('the current chapter says so instead of offering the action', async () => {
    renderAt('/chapter/ch10');
    expect(await screen.findByText('This is your current chapter')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Make this my current chapter' }),
    ).not.toBeInTheDocument();
  });

  test('"Make this my current chapter" updates the profile and the path', async () => {
    renderAt('/chapter/ch4');
    const button = await screen.findByRole('button', { name: 'Make this my current chapter' });
    await waitFor(() => expect(button).toBeEnabled()); // disabled until the profile has loaded
    fireEvent.click(button);
    expect(await screen.findByText('This is your current chapter')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Make this my current chapter' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to path' }));
    expect(
      await screen.findByRole('link', { name: 'Chapter 4, Numbers, current' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Chapter 10, Present tense of -er verbs, done' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 of 7 chapters done')).toBeInTheDocument();
  });

  test('without any readings, note or deck the page shows an empty readings state only', async () => {
    renderAt('/chapter/ch4');
    expect(await screen.findByText('No readings yet')).toBeInTheDocument();
    expect(screen.queryByText('Pattern')).not.toBeInTheDocument();
    expect(screen.queryByText('Starter deck')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add to reviews/ })).not.toBeInTheDocument();
  });
});
