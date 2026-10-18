import { useState, type ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button, type ButtonVariant } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { FlameHero, Icon, ICON_NAMES } from './Icon';
import { IconButton } from './IconButton';
import { Mascot } from './Mascot';
import { ProgressBar } from './ProgressBar';
import { SegmentedTabs } from './SegmentedTabs';
import { StreakChip } from './StreakChip';
import { TabBar } from './TabBar';
import { Toggle } from './Toggle';
import { TopBar } from './TopBar';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'success', 'danger', 'warn', 'ghost'];
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'learning', label: 'Learning' },
  { id: 'known', label: 'Known' },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold tracking-[0.06em] text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** Every UI kit component in every state. T-09 mounts this at /dev/ui. */
export function Gallery() {
  const [remind, setRemind] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-6">
      <h1 className="font-display text-3xl font-semibold">UI kit</h1>

      <Section title="Button">
        <div className="flex flex-col gap-3">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} fullWidth>
              {variant}
            </Button>
          ))}
          <div className="rounded-[22px] bg-primary p-4">
            <Button variant="inverse" size="sm" fullWidth>
              Start review (inverse)
            </Button>
          </div>
          <Button disabled fullWidth>
            Disabled
          </Button>
          <Button to="/today" fullWidth>
            <Icon name="mail" size={20} strokeWidth={2.2} />
            Link with icon
          </Button>
          <Row>
            <Button size="sm">Small 50</Button>
            <Button size="md">Medium 54</Button>
            <Button size="lg">Large 56</Button>
          </Row>
        </div>
      </Section>

      <Section title="IconButton">
        <Row>
          <IconButton icon="close" aria-label="Close" />
          <IconButton icon="volume" variant="soft" aria-label="Play pronunciation" />
          <IconButton icon="play" variant="solid" aria-label="Play" />
          <IconButton icon="pause" variant="solid" aria-label="Pause" />
          <IconButton icon="back" to="/today" aria-label="Back (link)" />
        </Row>
      </Section>

      <Section title="Card">
        <Card className="p-4">Plain card</Card>
        <Card tone="primary" className="p-4">
          Primary card
        </Card>
        <Card to="/chapter/ch10" className="flex items-center gap-3.5 p-3.5">
          <span className="flex size-[52px] items-center justify-center rounded-2xl bg-gold-soft text-gold-ink">
            <Icon name="book" size={28} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
              Book · Ch 10
            </span>
            <span className="text-[17px] font-extrabold">Link card</span>
          </span>
          <Icon name="forward" size={22} className="text-faint" />
        </Card>
      </Section>

      <Section title="Chip">
        <Row>
          <Chip>pronoun</Chip>
          <Chip variant="masc">le · masculine</Chip>
          <Chip variant="fem">la · feminine</Chip>
          <Chip variant="new">New</Chip>
        </Row>
        <Row>
          <Chip variant="status" status="new" />
          <Chip variant="status" status="learning" />
          <Chip variant="status" status="known" />
        </Row>
      </Section>

      <Section title="ProgressBar">
        <ProgressBar value={8} max={45} tone="gold" aria-label="Daily minutes" />
        <ProgressBar value={34} max={100} size="sm" aria-label="Audio position" />
        <ProgressBar value={11} max={18} tone="success" size="lg" aria-label="Review progress" />
      </Section>

      <Section title="Toggle">
        <Row>
          <Toggle checked={remind} onChange={setRemind} aria-label="Daily reminder" />
          <Toggle checked={autoplay} onChange={setAutoplay} aria-label="Play words when tapped" />
          <Toggle checked disabled onChange={setRemind} aria-label="Disabled switch" />
        </Row>
      </Section>

      <Section title="SegmentedTabs">
        <SegmentedTabs tabs={FILTERS} value={filter} onChange={setFilter} aria-label="Filter" />
      </Section>

      <Section title="StreakChip">
        <Row>
          <StreakChip count={12} to="/streak" />
          <StreakChip kind="freeze" count={2} to="/streak" />
          <StreakChip count={1} />
        </Row>
      </Section>

      <Section title="TopBar">
        <div className="rounded-card border-2 border-line bg-surface py-2">
          <TopBar title="Streak" nav={{ icon: 'back', label: 'Back', to: '/today' }} />
        </div>
        <div className="rounded-card border-2 border-line bg-surface py-2">
          <TopBar
            align="center"
            overline="Ch 10 · Reading 1"
            title="Le matin de Léa"
            nav={{ icon: 'close', label: 'Close reader', to: '/chapter/ch10' }}
            end={
              <button
                type="button"
                aria-label="Text settings"
                className="size-11 rounded-xl font-display text-lg font-semibold text-muted"
              >
                Aa
              </button>
            }
          />
        </div>
      </Section>

      <Section title="TabBar">
        <div className="overflow-hidden rounded-card border-2 border-line">
          <TabBar current="/path" />
        </div>
      </Section>

      <Section title="BottomSheet">
        <Row>
          <Button size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
        </Row>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Word details">
          <div className="flex items-center gap-2.5">
            <span lang="fr" className="font-display text-[32px] leading-none font-semibold">
              habite
            </span>
            <IconButton icon="volume" variant="soft" aria-label="Play pronunciation" />
            <span className="flex-1" />
            <IconButton
              icon="close"
              aria-label="Close word details"
              onClick={() => setSheetOpen(false)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip>verb</Chip>
            <Chip>
              from <span lang="fr">&nbsp;habiter</span>
            </Chip>
            <Chip variant="new">New</Chip>
          </div>
          <p className="text-xl font-extrabold">lives</p>
          <div className="flex gap-2.5 pt-1">
            <Button size="sm" variant="success">
              <Icon name="check" size={20} strokeWidth={3} />
              Saved
            </Button>
            <Button size="sm" variant="secondary">
              Sentence
            </Button>
          </div>
        </BottomSheet>
      </Section>

      <Section title="Mascot">
        <Row>
          <Mascot mood="happy" size={140} label="Frenchy mascot, a friendly snail" />
          <Mascot mood="cheer" size={140} label="Mascot cheering" />
          <FlameHero size={64} />
        </Row>
      </Section>

      <Section title="Icon">
        <div className="grid grid-cols-4 gap-3">
          {ICON_NAMES.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-btn-sm bg-surface p-2 text-ink"
            >
              <Icon name={name} />
              <span className="text-[11px] font-bold text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
