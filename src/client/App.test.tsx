import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';
import { setMockSignedIn } from './mocks/handlers/auth';

test('opens on the welcome screen when signed out', async () => {
  setMockSignedIn(false);
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'frenchy' })).toBeInTheDocument();
});
