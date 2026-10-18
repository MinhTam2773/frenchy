import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@client/App';
import { routes } from '@client/routes';

/** Test helper: the whole app (providers, layouts, guard) at `path`, with MSW answering the API. */
export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
