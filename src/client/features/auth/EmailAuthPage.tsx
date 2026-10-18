import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Link, TopBar } from '@client/ui';
import { authClient, sessionKey, useSession } from '@client/lib/session';
import { SignedInRedirect } from './SignedInRedirect';
import { TextField } from './TextField';
import {
  authErrorMessage,
  FIELD_ORDER,
  MIN_PASSWORD_LENGTH,
  validateAuth,
  type AuthErrors,
  type AuthMode,
  type AuthValues,
} from './validate';

const COPY = {
  'sign-up': {
    title: 'Create your account',
    submit: 'Create account',
    pending: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchTo: '/sign-in',
  },
  'sign-in': {
    title: 'Welcome back',
    submit: 'Sign in',
    pending: 'Signing in…',
    switchPrompt: 'New here?',
    switchLabel: 'Create an account',
    switchTo: '/sign-up',
  },
} as const;

const UNREACHABLE = authErrorMessage({ status: 0 });

function EmailAuthPage({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode];
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AuthValues>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'loading') return null;
  if (status === 'signed-in') return <SignedInRedirect />;

  const field = (name: keyof AuthValues) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event: { currentTarget: { value: string } }) =>
      setValues({ ...values, [name]: event.currentTarget.value }),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAuth(mode, values);
    setErrors(found);
    setFormError(null);
    const first = FIELD_ORDER[mode].find((name) => found[name]);
    if (first) {
      const input = event.currentTarget.elements.namedItem(first);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    setPending(true);
    const email = values.email.trim();
    try {
      const { error } =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: values.name.trim(),
              email,
              password: values.password,
            })
          : await authClient.signIn.email({ email, password: values.password });
      if (error) setFormError(authErrorMessage(error));
      // The session read now answers "signed in", and the redirect above takes over.
      else await queryClient.invalidateQueries({ queryKey: sessionKey });
    } catch {
      setFormError(UNREACHABLE);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <TopBar title={copy.title} nav={{ icon: 'back', label: 'Back', to: '/' }} />
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4 px-6 pt-4 pb-8"
      >
        {mode === 'sign-up' && <TextField label="Name" autoComplete="name" {...field('name')} />}
        <TextField label="Email" type="email" autoComplete="email" {...field('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          {...field('password')}
        />
        {mode === 'sign-up' && (
          <p className="-mt-2 text-sm font-semibold text-muted">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
        {formError && (
          <p role="alert" className="text-sm font-bold text-danger-ink">
            {formError}
          </p>
        )}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </Button>
        <p className="text-center text-[15px] font-semibold text-ink-2">
          {copy.switchPrompt}{' '}
          <Link to={copy.switchTo} className="font-extrabold text-primary">
            {copy.switchLabel}
          </Link>
        </p>
      </form>
    </>
  );
}

export function SignUpPage() {
  return <EmailAuthPage mode="sign-up" />;
}

export function SignInPage() {
  return <EmailAuthPage mode="sign-in" />;
}
