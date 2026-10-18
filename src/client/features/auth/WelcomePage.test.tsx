import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { newProfile } from '@shared/fixtures';
import { setMockSignedIn } from '@client/mocks/handlers/auth';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

async function openWelcome() {
  setMockSignedIn(false);
  renderAt('/');
  await screen.findByRole('heading', { name: 'frenchy' });
}

test('offers email, Google and sign-in', async () => {
  await openWelcome();
  expect(screen.getByRole('link', { name: 'Continue with email' })).toHaveAttribute(
    'href',
    '/sign-up',
  );
  expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'I already have an account' })).toHaveAttribute(
    'href',
    '/sign-in',
  );
  expect(screen.getByRole('img', { name: /mascot/ })).toBeInTheDocument();
});

test('hides Google when the Worker has no Google keys', async () => {
  server.use(http.get('/api/auth/config', () => HttpResponse.json({ google: false })));
  await openWelcome();
  // The config answers after the page paints, so wait for a request to have settled.
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Continue with email' })).toBeInTheDocument();
});

test('Google asks the Worker to start sign-in and come back to /', async () => {
  let body: unknown;
  server.use(
    http.post('/api/auth/sign-in/social', async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ url: 'https://accounts.example/start', redirect: false });
    }),
  );
  await openWelcome();
  fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  await waitFor(() => expect(body).toMatchObject({ provider: 'google', callbackURL: '/' }));
});

test('a Google failure is announced', async () => {
  server.use(
    http.post('/api/auth/sign-in/social', () =>
      HttpResponse.json({ message: 'nope' }, { status: 500 }),
    ),
  );
  await openWelcome();
  fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/);
});

test('a signed-in learner with a chapter goes straight to Today', async () => {
  renderAt('/');
  expect(await screen.findByRole('heading', { name: /Bonjour/ })).toBeInTheDocument();
});

test('a signed-in learner who has not chosen a chapter goes to onboarding', async () => {
  server.use(http.get('/api/profile', () => HttpResponse.json(newProfile)));
  renderAt('/');
  expect(
    await screen.findByRole('heading', { name: 'Which chapter are you on in the book?' }),
  ).toBeInTheDocument();
});
