import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { BottomSheet } from './BottomSheet';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} label="Word details">
        <button type="button">Play</button>
        <button type="button">Save word</button>
      </BottomSheet>
    </>
  );
}

function openSheet() {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open sheet' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

test('renders nothing while closed', () => {
  render(<Harness />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('opens as a named modal dialog and moves focus inside', () => {
  openSheet();
  const dialog = screen.getByRole('dialog', { name: 'Word details' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
});

test('Escape closes the sheet and returns focus to the trigger', () => {
  const trigger = openSheet();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('clicking the scrim closes the sheet and returns focus to the trigger', () => {
  const trigger = openSheet();
  const scrim = screen.getByRole('dialog').previousElementSibling;
  expect(scrim).not.toBeNull();
  if (scrim) fireEvent.click(scrim);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('Tab wraps from the last control to the first, and Shift+Tab the other way', () => {
  openSheet();
  const play = screen.getByRole('button', { name: 'Play' });
  const save = screen.getByRole('button', { name: 'Save word' });
  save.focus();
  fireEvent.keyDown(save, { key: 'Tab' });
  expect(play).toHaveFocus();
  fireEvent.keyDown(play, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
});
