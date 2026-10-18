import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Chip } from './Chip';
import { Gallery } from './Gallery';
import { ProgressBar } from './ProgressBar';
import { SegmentedTabs } from './SegmentedTabs';
import { StreakChip } from './StreakChip';
import { TopBar } from './TopBar';

test('the gallery renders every component', () => {
  render(<Gallery />);
  for (const title of [
    'Button',
    'IconButton',
    'Card',
    'Chip',
    'ProgressBar',
    'Toggle',
    'SegmentedTabs',
    'StreakChip',
    'TopBar',
    'TabBar',
    'BottomSheet',
    'Mascot',
    'Icon',
  ]) {
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  }
});

test('ProgressBar exposes progressbar semantics', () => {
  render(<ProgressBar value={3} max={18} aria-label="Review progress" />);
  const bar = screen.getByRole('progressbar', { name: 'Review progress' });
  expect(bar).toHaveAttribute('aria-valuenow', '3');
  expect(bar).toHaveAttribute('aria-valuemax', '18');
});

test('SegmentedTabs selects on click and moves with the arrow keys', () => {
  let value = 'all';
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'known', label: 'Known' },
  ] as const;
  const { rerender } = render(
    <SegmentedTabs tabs={tabs} value={value} onChange={(id) => (value = id)} aria-label="Filter" />,
  );
  expect(screen.getByRole('tablist', { name: 'Filter' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'All' }), { key: 'ArrowRight' });
  expect(value).toBe('new');
  rerender(
    <SegmentedTabs tabs={tabs} value={value} onChange={(id) => (value = id)} aria-label="Filter" />,
  );
  expect(screen.getByRole('tab', { name: 'New' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'New' })).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('tabindex', '-1');
});

test('Chip status shows its default label', () => {
  render(<Chip variant="status" status="learning" />);
  expect(screen.getByText('Learning')).toBeInTheDocument();
});

test('StreakChip names itself, as a link when given `to`', () => {
  render(
    <>
      <StreakChip count={12} to="/streak" />
      <StreakChip kind="freeze" count={1} />
    </>,
  );
  expect(screen.getByRole('link', { name: '12 day streak' })).toHaveAttribute('href', '/streak');
  expect(screen.getByRole('img', { name: '1 streak freeze' })).toBeInTheDocument();
});

test('TopBar renders a named back link and the title', () => {
  render(<TopBar title="Streak" nav={{ icon: 'back', label: 'Back', to: '/today' }} />);
  expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/today');
  expect(screen.getByRole('heading', { level: 1, name: 'Streak' })).toBeInTheDocument();
});
