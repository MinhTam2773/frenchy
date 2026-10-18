import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon, Link, Mascot } from '@client/ui';
import { api } from '@client/lib/api';
import { authClient, useSession } from '@client/lib/session';
import { authErrorMessage } from './validate';
import { SignedInRedirect } from './SignedInRedirect';

const GOOGLE_FAILED = 'Could not start Google sign-in. Try again, or continue with email.';

/** Shown only when the Worker has Google keys (H-03); hidden while that is unknown. */
function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError(null);
    try {
      // `/` sends the user on to onboarding or Today once Google returns.
      const { error: failure } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (failure) setError(authErrorMessage(failure));
    } catch {
      setError(GOOGLE_FAILED);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" fullWidth disabled={pending} onClick={() => void start()}>
        <span
          aria-hidden="true"
          className="flex size-[22px] items-center justify-center rounded-full border-2 border-ink text-xs font-extrabold tracking-normal"
        >
          G
        </span>
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm font-bold text-danger-ink">
          {error}
        </p>
      )}
    </>
  );
}

export function WelcomePage() {
  const { status } = useSession();
  const config = useQuery({
    queryKey: ['auth', 'config'],
    queryFn: api.auth.config,
    staleTime: Infinity,
  });
  if (status === 'loading') return null;
  if (status === 'signed-in') return <SignedInRedirect />;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 rounded-b-[40px] bg-primary-soft px-8 pt-12 pb-8">
        <span
          aria-hidden="true"
          className="absolute top-[72px] left-9 size-[18px] rounded-full bg-gold"
        />
        <span
          aria-hidden="true"
          className="absolute top-[132px] right-11 size-3 rounded-full bg-fem-dot"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-[120px] left-14 size-2.5 rounded-full bg-primary"
        />
        <Mascot size={200} label="Frenchy mascot, a friendly snail" />
        <div className="flex flex-col items-center gap-2.5">
          <h1 className="font-display text-[52px] leading-none font-bold tracking-[-0.01em] text-primary">
            frenchy
          </h1>
          <p className="max-w-[290px] text-center text-lg leading-[1.45] font-semibold text-ink-2">
            Learn French next to your book. Read, tap any word, and review a little every day.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 px-6 pt-7 pb-9">
        <Button to="/sign-up" fullWidth>
          <Icon name="mail" size={20} />
          Continue with email
        </Button>
        {config.data?.google && <GoogleButton />}
        <Link
          to="/sign-in"
          className="flex min-h-11 items-center self-center px-3 text-[15px] font-extrabold text-primary no-underline hover:text-primary-shadow"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
