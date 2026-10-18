import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockState } from './mocks/handlers/base';
import { server } from './mocks/server';

// A test that calls an API with no handler should fail, not hit the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

afterEach(() => {
  // Testing Library only auto-cleans when test globals are on; they are off here.
  cleanup();
  server.resetHandlers();
  resetMockState();
});
