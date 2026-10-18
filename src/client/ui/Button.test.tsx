import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Link, LinkProvider, type LinkProps } from './Link';

test('renders a <button type="button"> by default and handles clicks', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Start review</Button>);
  const button = screen.getByRole('button', { name: 'Start review' });
  expect(button).toHaveAttribute('type', 'button');
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledOnce();
});

test('renders a link when given `to`', () => {
  render(<Button to="/review">Start review</Button>);
  const link = screen.getByRole('link', { name: 'Start review' });
  expect(link).toHaveAttribute('href', '/review');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('renders a link when given `href`', () => {
  render(<Button href="https://example.com">Open</Button>);
  expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://example.com');
});

test('a disabled button does not fire clicks', () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      Save
    </Button>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onClick).not.toHaveBeenCalled();
});

test('uses the link component from LinkProvider for `to`', () => {
  function RouterLink({ to, children, ...rest }: LinkProps) {
    return (
      <a href={`/app${to}`} data-router {...rest}>
        {children}
      </a>
    );
  }
  render(
    <LinkProvider value={RouterLink}>
      <Button to="/review">Go</Button>
      <Link to="/path">Path</Link>
    </LinkProvider>,
  );
  expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/app/review');
  expect(screen.getByRole('link', { name: 'Path' })).toHaveAttribute('data-router');
});

test('IconButton is named by its aria-label and can be a link', () => {
  render(
    <>
      <IconButton icon="volume" aria-label="Play pronunciation" />
      <IconButton icon="back" aria-label="Back" to="/today" />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Play pronunciation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/today');
});
