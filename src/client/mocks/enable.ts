// On in dev unless VITE_USE_MOCKS=false; off in production unless VITE_USE_MOCKS=true.
// T-26 flips the dev default.
const flag = import.meta.env.VITE_USE_MOCKS as string | undefined;
const mocksEnabled = flag === undefined ? import.meta.env.DEV : flag === 'true';

export async function enableMocking() {
  if (!mocksEnabled) return;
  const { worker } = await import('./browser');
  // Vite assets and fonts are not API calls; let them through.
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}
