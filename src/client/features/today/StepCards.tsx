import type { ReactNode } from 'react';
import type { Chapter } from '@shared/schemas';
import { Card, Icon, type IconName } from '@client/ui';
import { chapterLabel, formatPdfPages, plural } from './format';
import type { ReadingPick } from './nextUnreadText';

type StepCardProps = {
  icon: IconName;
  /** Tile colours, as theme classes. */
  tile: string;
  step: string;
  title: ReactNode;
  detail: string;
  /** Without it the card is a plain prompt, with no chevron. */
  to?: string;
};

function StepCard({ icon, tile, step, title, detail, to }: StepCardProps) {
  return (
    <Card to={to}>
      <div className="flex items-center gap-3.5 p-3.5">
        <span
          className={`flex size-[52px] shrink-0 items-center justify-center rounded-2xl ${tile}`}
        >
          <Icon name={icon} size={28} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
            {step}
          </span>
          <span className="text-[17px] font-extrabold">{title}</span>
          <span className="text-sm font-semibold text-muted">{detail}</span>
        </span>
        {to !== undefined && <Icon name="forward" size={22} className="shrink-0 text-faint" />}
      </div>
    </Card>
  );
}

/** Step 2: where the learner is in the book. */
export function BookCard({ chapter }: { chapter: Chapter }) {
  const pages = formatPdfPages(chapter);
  const sections = chapter.sections.length;
  return (
    <StepCard
      to={`/chapter/${chapter.id}`}
      icon="book"
      tile="bg-gold-soft text-gold-ink"
      step={`2 · Book · ${chapterLabel(chapter)}`}
      title={chapter.title}
      detail={sections > 0 ? `${plural(sections, 'section')} · ${pages}` : pages}
    />
  );
}

/** Step 3: the next unread text of the current chapter. */
export function ReadingCard({ chapter, reading }: { chapter: Chapter; reading: ReadingPick }) {
  const props = { icon: 'volume-high', tile: 'bg-fem-soft text-fem' } as const;
  const step = '3 · Read & listen';
  switch (reading.kind) {
    case 'next': {
      const { text } = reading;
      const minutes = `${text.minutes} min`;
      return (
        <StepCard
          {...props}
          to={`/read/${text.id}`}
          step={step}
          title={<span lang="fr">{text.title}</span>}
          detail={
            text.newWords.length > 0
              ? `${minutes} · ${plural(text.newWords.length, 'new word')}`
              : minutes
          }
        />
      );
    }
    case 'all-read':
      return (
        <StepCard
          {...props}
          to={`/chapter/${chapter.id}`}
          step={step}
          title="All texts read"
          detail="Read any of them again from the chapter"
        />
      );
    case 'none':
      return (
        <StepCard
          {...props}
          step={step}
          title="Texts are on their way"
          detail={`Readings for ${chapterLabel(chapter)} aren’t ready yet`}
        />
      );
  }
}

/** Step 4: a short writing prompt. It becomes a link to the tutor when B-03 lands. */
export function OutputCard() {
  return (
    <StepCard
      icon="chat-lines"
      tile="bg-success-soft text-success-ink"
      step="4 · Output"
      title="Write 3–5 sentences"
      detail="Use today’s new words in your own notes"
    />
  );
}
