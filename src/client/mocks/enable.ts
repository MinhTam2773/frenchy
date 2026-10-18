// Off unless VITE_USE_MOCKS=true: `npm run dev` talks to the real Worker and local D1 (T-26).
// Vitest starts MSW itself (test-setup.ts).
const mocksEnabled = import.meta.env.VITE_USE_MOCKS === 'true';

export async function enableMocking() {
  if (!mocksEnabled) return;
  const { worker } = await import('./browser');
  // Vite assets and fonts are not API calls; let them through.
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}
