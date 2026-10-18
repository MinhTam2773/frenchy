import type { Chapter } from '@shared/schemas';

export const SECONDS_PER_CARD = 35;

/** Rounds .5 down, so the mockup's 18 cards reads "about 10 min"; never less than 1. */
export function estimateReviewMinutes(cards: number): number {
  return Math.max(1, Math.ceil((cards * SECONDS_PER_CARD) / 60 - 0.5));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "in 25 min", "in 3 h", "in 2 days"; "soon" when it is already due. */
export function formatDueIn(dueAt: number, now: number): string {
  const diff = dueAt - now;
  if (diff < MINUTE) return 'soon';
  if (diff < HOUR) return `in ${Math.ceil(diff / MINUTE)} min`;
  if (diff < DAY) return `in ${Math.round(diff / HOUR)} h`;
  const days = Math.round(diff / DAY);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Ch 10", or "App. A" for an appendix. */
export function chapterLabel(chapter: Pick<Chapter, 'kind' | 'number'>): string {
  return chapter.kind === 'appendix' ? `App. ${chapter.number}` : `Ch ${chapter.number}`;
}

export function formatPdfPages(chapter: Pick<Chapter, 'pdfStart' | 'pdfEnd'>): string {
  return chapter.pdfStart === chapter.pdfEnd
    ? `PDF p. ${chapter.pdfStart}`
    : `PDF pp. ${chapter.pdfStart}–${chapter.pdfEnd}`;
}
