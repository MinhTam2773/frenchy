import { useParams } from 'react-router';
import { getChapter, getChapterTexts, getCourse, getDeck, getNote } from '@shared/content';
import { Button } from '@client/ui';
import { ChapterView } from './ChapterView';

export function ChapterPage() {
  const { chapterId = '' } = useParams();
  const chapter = getChapter(chapterId);
  const stage = getCourse().stages.find((s) => s.chapters.some((c) => c.id === chapterId));

  if (!chapter || !stage) {
    return (
      <div className="flex flex-col items-start gap-4 p-4">
        <h1 className="font-display text-2xl font-semibold">Chapter not found</h1>
        <Button to="/path">Back to path</Button>
      </div>
    );
  }
  return (
    <ChapterView
      chapter={chapter}
      stage={stage}
      texts={getChapterTexts(chapterId)}
      note={getNote(chapterId)}
      deck={getDeck(chapterId)}
    />
  );
}
