import { Button } from '../ui';

type IosInstallHintProps = {
  onDismiss: () => void;
};

export function IosInstallHint({ onDismiss }: IosInstallHintProps) {
  return (
    <section
      aria-label="Install Frenchy"
      className="pointer-events-auto flex items-center gap-3 rounded-card border-2 border-primary-line bg-surface p-3 pl-4 text-ink shadow-sheet"
    >
      <p className="flex-1 text-[15px] font-semibold">
        Install Frenchy: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
      </p>
      <Button variant="secondary" size="sm" onClick={onDismiss}>
        Got it
      </Button>
    </section>
  );
}
