import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetAuthMock } from './mocks/handlers/auth';
import { resetMockState } from './mocks/handlers/base';
import { server } from './mocks/server';

// findBy* waits 1 s by default, which a loaded machine can miss (L-74).
configure({ asyncUtilTimeout: 5_000 });

// A test that calls an API with no handler should fail, not hit the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

afterEach(() => {
  // Testing Library only auto-cleans when test globals are on; they are off here.
  cleanup();
  server.resetHandlers();
  resetMockState();
  resetAuthMock();
});
