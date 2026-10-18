import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { setMockSignedIn, WRONG_PASSWORD } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

async function openForm(path: '/sign-up' | '/sign-in') {
  setMockSignedIn(false);
  renderAt(path);
  await screen.findByRole('textbox', { name: 'Email' });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test('the fields have labels and the right autocomplete hints', async () => {
  await openForm('/sign-up');
  expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name');
  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
});

test('sign-in has no name field, a current-password hint and no "forgot password" (G-08)', async () => {
  await openForm('/sign-in');
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
});

test('an empty sign-up names each problem and focuses the first field', async () => {
  await openForm('/sign-up');
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  const name = screen.getByLabelText('Name');
  expect(name).toHaveFocus();
  expect(name).toBeInvalid();
  expect(name).toHaveAccessibleDescription('Enter your name.');
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email.');
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.');
});

test('a bad email and a short password are explained, and nothing is sent', async () => {
  let sent = false;
  server.use(
    http.post('/api/auth/sign-up/email', () => {
      sent = true;
      return HttpResponse.json({});
    }),
  );
  await openForm('/sign-up');
  fill('Name', 'Marc');
  fill('Email', 'marc@');
  fill('Password', 'short');
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  expect(screen.getByLabelText('Email')).toHaveFocus();
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/valid email/);
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
    'Use at least 8 characters.',
  );
  expect(sent).toBe(false);
});

test('fixing a field and submitting again clears its error', async () => {
  await openForm('/sign-in');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByLabelText('Email')).toBeInvalid();
  fill('Email', 'lea@example.com');
  fill('Password', 'whatever-it-is');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(screen.queryByText('Enter your email.')).not.toBeInTheDocument());
});

test('signing up lands on onboarding, and saving the profile lands on Today', async () => {
  setMockSignedIn(false);
  renderAt('/');
  fireEvent.click(await screen.findByRole('link', { name: 'Continue with email' }));
  await screen.findByRole('heading', { name: 'Create your account' });
  fill('Name', 'Marc');
  fill('Email', 'marc@example.com');
  fill('Password', 'correct-horse');
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  expect(
    await screen.findByRole('heading', { name: 'Which chapter are you on in the book?' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(await screen.findByRole('heading', { name: /Bonjour/ })).toBeInTheDocument();
});

test('an email that already has an account is explained', async () => {
  await openForm('/sign-up');
  fill('Name', 'Léa');
  fill('Email', 'lea@example.com');
  fill('Password', 'correct-horse');
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/already has an account/);
  expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
});

test('signing in with the right password goes to Today', async () => {
  await openForm('/sign-in');
  fill('Email', 'lea@example.com');
  fill('Password', 'correct-horse');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: /Bonjour/ })).toBeInTheDocument();
});

test('a wrong password is announced and the form stays', async () => {
  await openForm('/sign-in');
  fill('Email', 'lea@example.com');
  fill('Password', WRONG_PASSWORD);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'That email and password do not match.',
  );
  expect(screen.getByLabelText('Email')).toHaveValue('lea@example.com');
});

test('too many attempts and a lost connection get their own messages', async () => {
  server.use(
    http.post('/api/auth/sign-in/email', () =>
      HttpResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 }),
    ),
  );
  await openForm('/sign-in');
  fill('Email', 'lea@example.com');
  fill('Password', 'correct-horse');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Too many tries/);

  server.use(http.post('/api/auth/sign-in/email', () => HttpResponse.error()));
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/could not reach the server/),
  );
});

test('the two forms link to each other', async () => {
  await openForm('/sign-up');
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  fireEvent.click(screen.getByRole('link', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
    'href',
    '/sign-up',
  );
});
