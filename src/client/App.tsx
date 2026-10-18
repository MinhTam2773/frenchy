import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createBrowserRouter, Link as RouterLinkBase } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@client/lib/query';
import { routes } from '@client/routes';
import { LinkProvider, type LinkProps } from '@client/ui';

// The kit's links are plain anchors; this makes every `to` a client-side navigation (G-16).
function RouterLink({ to, children, ...rest }: LinkProps) {
  return (
    <RouterLinkBase to={to} {...rest}>
      {children}
    </RouterLinkBase>
  );
}

/** Providers every screen needs: server-state cache and router-aware links. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <LinkProvider value={RouterLink}>{children}</LinkProvider>
    </QueryClientProvider>
  );
}

export function App() {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
