import { expect, test } from 'vitest';
import { authErrorMessage, validateAuth } from './validate';

const good = { name: 'Léa', email: 'lea@example.com', password: 'correct-horse' };

test('a complete sign-up has no errors', () => {
  expect(validateAuth('sign-up', good)).toEqual({});
});

test('empty sign-up fields are each named', () => {
  expect(validateAuth('sign-up', { name: ' ', email: '', password: '' })).toEqual({
    name: 'Enter your name.',
    email: 'Enter your email.',
    password: 'Enter your password.',
  });
});

test.each(['lea', 'lea@', '@example.com', 'lea@example', 'le a@example.com'])(
  'rejects the email "%s"',
  (email) => {
    expect(validateAuth('sign-in', { ...good, email }).email).toMatch(/valid email/);
  },
);

test('a new password needs 8 characters, but sign-in does not re-check the length', () => {
  const short = { ...good, password: '1234567' };
  expect(validateAuth('sign-up', short).password).toBe('Use at least 8 characters.');
  expect(validateAuth('sign-up', { ...good, password: '12345678' })).toEqual({});
  expect(validateAuth('sign-in', short)).toEqual({});
});

test('sign-in does not ask for a name', () => {
  expect(validateAuth('sign-in', { ...good, name: '' })).toEqual({});
});

test.each([
  [{ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' }, /do not match/],
  [{ status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }, /already has an account/],
  [{ status: 429 }, /Too many tries/],
  [{ status: 0 }, /could not reach the server/],
  [{ status: 503 }, /could not reach the server/],
  [{ status: 400, code: 'SOMETHING_NEW' }, /Something went wrong/],
])('maps %j to friendly copy', (failure, message) => {
  expect(authErrorMessage(failure)).toMatch(message);
});
