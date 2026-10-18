import { act, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';

function goOffline(offline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!offline);
  act(() => {
    window.dispatchEvent(new Event(offline ? 'offline' : 'online'));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const OFFLINE = /You’re offline/;

test.each(['/today', '/streak', '/'])('%s shows a banner while the device is offline', async (path) => {
  renderAt(path);
  await screen.findAllByRole('heading');
  expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();

  goOffline(true);
  expect(screen.getByText(OFFLINE)).toBeInTheDocument();

  goOffline(false);
  expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();
});
