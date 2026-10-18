/** Same minimum as the Worker (`MIN_PASSWORD_LENGTH` in src/worker/auth), which enforces it for real. */
export const MIN_PASSWORD_LENGTH = 8;

export type AuthMode = 'sign-up' | 'sign-in';
export type AuthField = 'name' | 'email' | 'password';
export type AuthValues = Record<AuthField, string>;
export type AuthErrors = Partial<Record<AuthField, string>>;

/** Top to bottom, so the first invalid field is the one to focus. */
export const FIELD_ORDER: Record<AuthMode, AuthField[]> = {
  'sign-up': ['name', 'email', 'password'],
  'sign-in': ['email', 'password'],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks what the Worker would reject anyway, so the user hears it without a round trip. */
export function validateAuth(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'sign-up' && !values.name.trim()) errors.name = 'Enter your name.';
  if (!values.email.trim()) errors.email = 'Enter your email.';
  else if (!EMAIL.test(values.email.trim())) {
    errors.email = 'Enter a valid email, like you@example.com.';
  }
  if (!values.password) errors.password = 'Enter your password.';
  else if (mode === 'sign-up' && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

type AuthFailure = { status: number; code?: string };

/** Friendly copy for what Better Auth can answer; its own messages are not shown. */
export function authErrorMessage(error: AuthFailure): string {
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return 'That email and password do not match.';
  if (error.code?.startsWith('USER_ALREADY_EXISTS')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (error.status === 429) return 'Too many tries. Wait a minute, then try again.';
  if (error.status === 0 || error.status >= 500) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Try again.';
}
