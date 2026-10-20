import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ACCOUNT_DELETE_CONFIRMATION, type AccountExport } from '@shared/schemas';
import { BottomSheet, Button, Icon } from '@client/ui';
import { api } from '@client/lib/api';
import { useSession } from '@client/lib/session';
import { TextField } from '@client/features/auth/TextField';

const rowClass = 'flex min-h-[50px] w-full items-center gap-2.5 px-3.5 py-1 text-left';

/** Hands the export to the browser as a file; nothing is stored on the device. */
function saveAsFile(data: AccountExport) {
  const day = new Date(data.exportedAt).toISOString().slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `frenchy-export-${day}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useSession();
  const [typed, setTyped] = useState('');
  const remove = useMutation({
    mutationFn: async () => {
      await api.account.delete({ confirm: ACCOUNT_DELETE_CONFIRMATION });
      // The session is gone with the account; this clears the cookie and the cached data, and
      // the route guard then sends the user to the welcome screen.
      await signOut();
    },
  });
  const confirmed = typed.trim().toLowerCase() === ACCOUNT_DELETE_CONFIRMATION;

  function close() {
    if (remove.isPending) return;
    setTyped('');
    remove.reset();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={close} label="Delete your account">
      <h2 className="font-display text-xl font-semibold">Delete your account?</h2>
      <p className="text-[15px] font-semibold text-muted">
        This permanently deletes your cards, reviews, streak, saved words and settings. It can’t be
        undone. Download your data first if you want a copy.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmed) remove.mutate();
        }}
      >
        <TextField
          label={`Type “${ACCOUNT_DELETE_CONFIRMATION}” to confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {remove.isError && (
          <p role="alert" className="text-sm font-bold text-danger-ink">
            Could not delete your account. Nothing was removed. Try again.
          </p>
        )}
        <Button type="submit" variant="danger" fullWidth disabled={!confirmed || remove.isPending}>
          {remove.isPending ? 'Deleting…' : 'Delete account'}
        </Button>
        <Button type="button" variant="secondary" fullWidth onClick={close}>
          Cancel
        </Button>
      </form>
    </BottomSheet>
  );
}

export function AccountSection() {
  const [confirming, setConfirming] = useState(false);
  const download = useMutation({ mutationFn: api.account.export, onSuccess: saveAsFile });

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="mx-1 font-display text-sm font-semibold tracking-[0.06em] text-muted uppercase">
        Your data
      </h2>
      <div className="divide-y-2 divide-chip overflow-hidden rounded-[18px] border-2 border-line bg-surface">
        <button
          type="button"
          onClick={() => download.mutate()}
          disabled={download.isPending}
          className={rowClass}
        >
          <span className="flex-1 text-[15px] font-bold">Download my data</span>
          <span className="text-sm font-bold text-muted">
            {download.isPending ? 'Preparing…' : 'JSON file'}
          </span>
          <Icon name="forward" size={18} className="text-faint" />
        </button>
        <button type="button" onClick={() => setConfirming(true)} className={rowClass}>
          <span className="flex-1 text-[15px] font-bold text-danger-ink">Delete account</span>
          <Icon name="forward" size={18} className="text-faint" />
        </button>
      </div>
      <p role="status" className="mx-1 text-[13px] font-bold text-muted empty:hidden">
        {download.isSuccess && 'Your data was saved to a file.'}
      </p>
      {download.isError && (
        <p role="alert" className="mx-1 text-[13px] font-bold text-danger-ink">
          Could not download your data. Try again.
        </p>
      )}
      <DeleteSheet open={confirming} onClose={() => setConfirming(false)} />
    </section>
  );
}
