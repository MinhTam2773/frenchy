import type { RequestHandler } from 'msw';
import { handlers as base } from './base';

// A screen task adds `handlers/<feature>.ts` exporting `handlers: RequestHandler[]` and it is
// picked up here with no edit. Feature handlers come first, so they win over `base.ts`.
const featureModules = import.meta.glob<{ handlers: RequestHandler[] }>(
  ['./*.ts', '!./index.ts', '!./base.ts', '!./*.test.ts'],
  { eager: true },
);

export const handlers: RequestHandler[] = [
  ...Object.values(featureModules).flatMap((module) => module.handlers),
  ...base,
];
