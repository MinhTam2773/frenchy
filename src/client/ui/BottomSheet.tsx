import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog, e.g. "Word details". */
  label: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, label, children }: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Move focus into the sheet on open and give it back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    return () => trigger?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.current.focus();
        return;
      }
      const inside = panel.current.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Pointer-only shortcut: Escape is the keyboard way to close. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative flex w-full max-w-[480px] flex-col gap-2.5 rounded-t-sheet border-t-2 border-line bg-surface px-5 pt-2.5 pb-[max(1.625rem,env(safe-area-inset-bottom))] shadow-sheet outline-none"
      >
        <div aria-hidden="true" className="h-[5px] w-11 self-center rounded-full bg-line-strong" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
