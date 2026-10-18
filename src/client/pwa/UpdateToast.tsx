import { Button } from '../ui';

type UpdateToastProps = {
  onReload: () => void;
  onDismiss: () => void;
};

export function UpdateToast({ onReload, onDismiss }: UpdateToastProps) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center gap-3 rounded-card bg-ink p-3 pl-4 text-white shadow-sheet"
    >
      <p className="flex-1 text-[15px] font-semibold">A new version of Frenchy is ready.</p>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-11 rounded-btn-sm px-2 text-[15px] font-bold underline"
      >
        Later
      </button>
      <Button variant="inverse" size="sm" onClick={onReload}>
        Reload
      </Button>
    </div>
  );
}
