import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCourse } from '@shared/content';
import type { Chapter, Deck, GrammarNote, Stage, Text } from '@shared/schemas';
import { chapterState } from '@client/features/path/pathModel';
import { api } from '@client/lib/api';
import { queryKeys, useProfile } from '@client/lib/query';
import { Button, Icon, IconButton } from '@client/ui';
import { PatternCard } from './PatternCard';
import { Readings } from './Readings';
import { SectionProgress } from './SectionProgress';
import { StarterDeckTile } from './StarterDeckTile';

export type ChapterViewProps = {
  chapter: Chapter;
  stage: Stage;
  /** Lesson texts, note and deck come from `content/`; a chapter may have none of them yet. */
  texts: Text[];
  note?: GrammarNote;
  deck?: Deck;
};

function CurrentChapterAction({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const setCurrent = useMutation({
    mutationFn: () => api.profile.patch({ currentChapterId: chapterId }),
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.profile, updated),
  });

  if (profile.data?.currentChapterId === chapterId) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-3 text-[15px] font-extrabold text-success-ink"
      >
        <Icon name="check" size={20} />
        This is your current chapter
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        fullWidth
        disabled={profile.isPending || setCurrent.isPending}
        onClick={() => setCurrent.mutate()}
      >
        Make this my current chapter
      </Button>
      {setCurrent.isError && (
        <p role="alert" className="text-center text-sm font-bold text-danger-ink">
          Could not change your chapter. Try again.
        </p>
      )}
    </div>
  );
}

/** `Chapter.dc.html`. Everything below the title is optional so a chapter with no content yet still reads well. */
export function ChapterView({ chapter, stage, texts, note, deck }: ChapterViewProps) {
  const profile = useProfile();
  const readings = useQuery({ queryKey: queryKeys.readings, queryFn: api.activity.readings });
  const finished = new Set(readings.data?.readings.map((reading) => reading.textId));
  const state = chapterState(getCourse(), chapter.id, profile.data?.currentChapterId ?? null);
  const kind = chapter.kind === 'appendix' ? 'Appendix' : 'Chapter';

  return (
    <div className="pb-8">
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <IconButton icon="back" aria-label="Back to path" to="/path" />
        <span className="flex-1 text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">
          Stage {stage.number} · {kind} {chapter.number}
        </span>
        <span className="flex h-[30px] items-center rounded-full bg-primary-soft px-2.5 text-[13px] font-extrabold text-primary">
          {stage.level}
        </span>
      </header>

      <section className="flex flex-col gap-2.5 px-5 pt-0.5 pb-3.5">
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold">{chapter.title}</h1>
        <p className="flex items-center gap-2 text-sm font-bold text-muted">
          <Icon name="book" size={18} strokeWidth={2.2} />
          Book: PDF p. {chapter.pdfStart}–{chapter.pdfEnd}
        </p>
        <SectionProgress sections={chapter.sections} allDone={state === 'done'} />
      </section>

      <div className="flex flex-col gap-3 px-4">
        {note && <PatternCard note={note} voice={profile.data?.settings} />}
        <Readings texts={texts} finished={finished} />
        {/* The typed drill (Drills.dc.html) joins this row in B-01. */}
        {deck && <StarterDeckTile chapterId={chapter.id} cardCount={deck.cards.length} />}
        <CurrentChapterAction chapterId={chapter.id} />
      </div>
    </div>
  );
}
