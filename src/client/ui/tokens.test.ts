import { expect, test } from 'vitest';

const sources = import.meta.glob<string>('./*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

test('no kit file uses a raw hex colour', () => {
  const offenders = Object.entries(sources)
    .filter(([path]) => !path.includes('.test.'))
    .filter(([, source]) => /#[0-9a-f]{3,8}\b/i.test(source))
    .map(([path]) => path);
  expect(Object.keys(sources).length).toBeGreaterThan(10);
  expect(offenders).toEqual([]);
});
