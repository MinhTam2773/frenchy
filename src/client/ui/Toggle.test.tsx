import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { Toggle } from './Toggle';

function Harness({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return <Toggle checked={on} onChange={setOn} aria-label="Daily reminder" />;
}

test('is a switch that flips aria-checked on click', () => {
  render(<Harness initial={false} />);
  const toggle = screen.getByRole('switch', { name: 'Daily reminder' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('a disabled switch does not flip', () => {
  render(<Toggle checked disabled onChange={() => {}} aria-label="Locked" />);
  const toggle = screen.getByRole('switch', { name: 'Locked' });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-checked', 'true');
});
