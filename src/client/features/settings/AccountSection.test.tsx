import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, test, vi } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';
import { server } from '@client/mocks/server';

afterEach(() => {
  vi.restoreAllMocks();
});

async function openSettings() {
  renderAt('/me');
  await screen.findByRole('button', { name: /Download my data/ });
}

async function openDeleteSheet() {
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  return screen.getByRole('dialog', { name: 'Delete your account' });
}

test('downloads the export as a JSON file', async () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:export');
  // jsdom has neither.
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = vi.fn();
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });

  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: /Download my data/ }));

  expect(await screen.findByText('Your data was saved to a file.')).toBeInTheDocument();
  const blob = createObjectURL.mock.calls[0]?.[0];
  expect(blob.type).toBe('application/json');
  const saved = JSON.parse(await blob.text()) as { user: { email: string }; tables: object };
  expect(saved.user.email).toBe('lea@example.com');
  expect(Object.keys(saved.tables)).toContain('profiles');
  expect(clicked[0]?.download).toMatch(/^frenchy-export-\d{4}-\d{2}-\d{2}\.json$/);
});

test('says so when the export fails', async () => {
  server.use(http.get('/api/account/export', () => HttpResponse.error()));
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: /Download my data/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not download your data');
});

test('deleting needs the confirmation word, then signs out to the welcome screen', async () => {
  const sheet = await openDeleteSheet();
  const confirm = within(sheet).getByRole('button', { name: 'Delete account' });
  expect(confirm).toBeDisabled();

  fireEvent.change(within(sheet).getByLabelText(/Type .delete. to confirm/), {
    target: { value: 'dele' },
  });
  expect(confirm).toBeDisabled();
  // Phone keyboards capitalise the first letter.
  fireEvent.change(within(sheet).getByLabelText(/Type .delete. to confirm/), {
    target: { value: 'Delete' },
  });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);

  expect(await screen.findByRole('heading', { name: 'frenchy' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Continue with email' })).toBeInTheDocument();
});

test('sends the exact confirmation the API expects', async () => {
  let body: unknown;
  server.use(
    http.delete('/api/account', async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ deleted: true });
    }),
  );
  const sheet = await openDeleteSheet();
  fireEvent.change(within(sheet).getByLabelText(/Type .delete. to confirm/), {
    target: { value: ' DELETE ' },
  });
  fireEvent.click(within(sheet).getByRole('button', { name: 'Delete account' }));
  await waitFor(() => expect(body).toEqual({ confirm: 'delete' }));
});

test('cancel closes the sheet and deletes nothing', async () => {
  const called = vi.fn();
  server.use(
    http.delete('/api/account', () => {
      called();
      return HttpResponse.json({ deleted: true });
    }),
  );
  const sheet = await openDeleteSheet();
  fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(called).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});

test('a failed delete keeps the user signed in and says so', async () => {
  server.use(http.delete('/api/account', () => HttpResponse.error()));
  const sheet = await openDeleteSheet();
  fireEvent.change(within(sheet).getByLabelText(/Type .delete. to confirm/), {
    target: { value: 'delete' },
  });
  fireEvent.click(within(sheet).getByRole('button', { name: 'Delete account' }));
  expect(await within(sheet).findByRole('alert')).toHaveTextContent('Nothing was removed');
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});
