import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('opens on the welcome screen', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
});
