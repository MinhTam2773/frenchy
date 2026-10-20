import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';

test('lists both data attributions with their links', async () => {
  renderAt('/credits');
  expect(await screen.findByRole('heading', { name: 'Credits' })).toBeInTheDocument();

  const expectLink = (name: string, href: string) =>
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  expectLink('Wiktionary', 'https://en.wiktionary.org/');
  expectLink('kaikki.org', 'https://kaikki.org/');
  expectLink('Lexique 3.83', 'http://www.lexique.org/');
  const licenses = screen.getAllByRole('link', { name: 'CC BY-SA 4.0' });
  expect(licenses).toHaveLength(2);
  for (const license of licenses) {
    expect(license).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
  }

  expect(
    screen.getByText(
      /Dictionary data from.*contributors, extracted by.*\(wiktextract, Tatu Ylonen\), licensed.*Modified\./s,
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Word frequencies from.*\(Boris New, Christophe Pallier et al\.\), licensed/s),
  ).toBeInTheDocument();
});

test('the Me screen links to Credits', async () => {
  renderAt('/me');
  expect(await screen.findByRole('link', { name: /Credits/ })).toHaveAttribute('href', '/credits');
});
