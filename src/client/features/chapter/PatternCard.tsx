import type { GrammarNote } from '@shared/schemas';
import { useTts } from '@client/lib/tts/useTts';
import { Card, IconButton } from '@client/ui';

type PatternCardProps = {
  note: GrammarNote;
  /** From the profile; null voice lets the device pick the best fr-FR voice. */
  voice?: { voiceURI: string | null; rate: number };
};

export function PatternCard({ note, voice }: PatternCardProps) {
  const { speak, supported } = useTts();
  const rowCount = Math.ceil(note.rows.length / 2);
  return (
    <Card className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
            Pattern
          </div>
          <div className="text-lg font-extrabold">
            <span lang="fr">{note.title}</span>
            {note.subtitle && <span className="font-semibold text-muted"> · {note.subtitle}</span>}
          </div>
        </div>
        {supported && (
          <IconButton
            icon="volume"
            variant="soft"
            aria-label={`Play ${note.title}`}
            onClick={() =>
              void speak(note.rows.map((row) => row.fr).join('. '), {
                rate: voice?.rate,
                voiceURI: voice?.voiceURI ?? undefined,
              })
            }
          />
        )}
      </div>
      {/* Two columns filled top to bottom: je / tu / il on the left, nous / vous / ils on the right. */}
      <dl
        lang="fr"
        className="grid grid-flow-col gap-x-3.5 gap-y-1.5 text-base font-bold"
        style={{
          gridTemplateRows: `repeat(${rowCount}, auto)`,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        }}
      >
        {note.rows.map((row, i) => {
          const stem = row.ending ? row.fr.slice(0, row.fr.length - row.ending.length) : row.fr;
          return (
            <div key={`${row.label}-${i}`} className="flex flex-wrap gap-x-1.5 wrap-anywhere">
              <dt className="text-muted">{row.label}</dt>
              <dd>
                {stem}
                {row.ending && <span className="text-primary">{row.ending}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-sm leading-[1.45] font-semibold text-ink-2">{note.tip}</p>
    </Card>
  );
}
