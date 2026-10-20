import { useParams } from 'react-router';
import { getChapter, getCourse, getNote } from '@shared/content';
import { useChapterTexts, useDeck } from '@client/lib/content';
import { Button } from '@client/ui';
import { ChapterView } from './ChapterView';

export function ChapterPage() {
  const { chapterId = '' } = useParams();
  const chapter = getChapter(chapterId);
  const stage = getCourse().stages.find((s) => s.chapters.some((c) => c.id === chapterId));
  const texts = useChapterTexts(chapter && chapterId);
  const deck = useDeck(chapterId);

  if (!chapter || !stage) {
    return (
      <div className="flex flex-col items-start gap-4 p-4">
        <h1 className="font-display text-2xl font-semibold">Chapter not found</h1>
        <Button to="/path">Back to path</Button>
      </div>
    );
  }
  if (texts.isError || deck.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4">
        <p className="font-bold">Couldn’t load this chapter.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void Promise.all([texts.refetch(), deck.refetch()])}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!texts.data || deck.data === undefined) {
    return (
      <p role="status" className="p-4 text-muted">
        Loading chapter…
      </p>
    );
  }
  return (
    <ChapterView
      chapter={chapter}
      stage={stage}
      texts={texts.data}
      note={getNote(chapterId)}
      deck={deck.data ?? undefined}
    />
  );
}
