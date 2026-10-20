import './zod-jitless';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { enableMocking } from './mocks/enable';
import { PwaPrompts } from './pwa';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

// The first API call must not run before the mock service worker is ready.
void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
      <PwaPrompts />
    </StrictMode>,
  );
});
