import '@testing-library/jest-dom/vitest';
// jsdom has no IndexedDB; the offline review store (B-08) needs one.
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearOfflineData } from './lib/offline';
import { resetAuthMock } from './mocks/handlers/auth';
import { resetMockState } from './mocks/handlers/base';
import { server } from './mocks/server';

// findBy* waits 1 s by default, which a loaded machine can miss (L-74).
configure({ asyncUtilTimeout: 5_000 });

// A test that calls an API with no handler should fail, not hit the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

afterEach(async () => {
  // Testing Library only auto-cleans when test globals are on; they are off here.
  cleanup();
  await clearOfflineData();
  server.resetHandlers();
  resetMockState();
  resetAuthMock();
});
