import { useEffect, useRef, useState } from 'react';
import { IosInstallHint } from './IosInstallHint';
import { readInstallEnv, shouldShowIosHint } from './platform';
import { registerServiceWorker } from './register';
import { UpdateToast } from './UpdateToast';

export const HINT_SEEN_KEY = 'frenchy:ios-install-hint-seen';

// localStorage can throw (private mode, blocked site data); the hint then shows once per load.
function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberHintSeen() {
  try {
    localStorage.setItem(HINT_SEEN_KEY, '1');
  } catch {
    // Not remembered; see above.
  }
}

/**
 * Registers the service worker and shows the two PWA prompts: "new version" and the one-time iOS
 * "Add to Home Screen" hint. Mount once, inside the app shell.
 */
export function PwaPrompts() {
  const [updateReady, setUpdateReady] = useState(false);
  const [hintOpen, setHintOpen] = useState(
    () => !hintSeen() && shouldShowIosHint(readInstallEnv()),
  );
  const applyUpdate = useRef<(() => void) | null>(null);

  useEffect(() => {
    applyUpdate.current = registerServiceWorker(() => setUpdateReady(true));
  }, []);

  function dismissHint() {
    rememberHintSeen();
    setHintOpen(false);
  }

  if (!updateReady && !hintOpen) return null;
  return (
    // Sits above the tab bar; pointer-events pass through the gaps around the cards.
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2">
      {updateReady && (
        <UpdateToast
          onReload={() => applyUpdate.current?.()}
          onDismiss={() => setUpdateReady(false)}
        />
      )}
      {hintOpen && <IosInstallHint onDismiss={dismissHint} />}
    </div>
  );
}
