# Client

Vite + React SPA. Layout: `ui/` kit, `features/<feature>/` screens, `layouts/`, `lib/`, `mocks/`.

## Add or build a screen

Every MVP route already exists with a placeholder page, so building a screen is mostly replacing a file.

1. **Page:** edit `features/<feature>/<Name>Page.tsx` (named export, e.g. `TodayPage`). Drop the `<Placeholder>`. The route table is `routes.tsx`; the page is already wired to its path and layout, so you rarely touch it. A new route is one object in `routes.tsx`: put it in the `TabLayout` group if the tab bar shows, otherwise in the `RequireSession` group under `FullScreenLayout`. Use `lazy: async () => ({ Component: (await import('...')).Page })` for heavy screens.
2. **API data:** call `api.*` from `lib/api.ts` inside TanStack Query hooks (`useQuery`, `useMutation`). Use `queryKeys` and `useProfile` from `lib/query.ts` for shared resources so screens stay in sync. Errors reject with `ApiClientError` (`code`, `status`, `message`, `issues`).
3. **Mock data:** `mocks/handlers/base.ts` already serves every endpoint in `docs/api-contract.md` from `src/shared/fixtures`, so a screen works with no extra handler. When you need a different state (empty, error, a stateful flow), create `mocks/handlers/<feature>.ts`:

   ```ts
   import { http, HttpResponse, type RequestHandler } from 'msw';
   import { allCaughtUpStats } from '@shared/fixtures';

   export const handlers: RequestHandler[] = [
     http.get('/api/cards/stats', () => HttpResponse.json(allCaughtUpStats)),
   ];
   ```

   Nothing else to edit: `mocks/handlers/index.ts` picks up every file in that folder, and feature handlers win over `base.ts`. In a test, `server.use(...)` (from `mocks/server.ts`) overrides a handler for one case.
4. **Test:** colocate `*.test.tsx`. `renderAt('/today')` from `mocks/renderAt.tsx` renders the whole app (providers, layout, guard) at a path with MSW answering. The test setup starts MSW and fails on any request that has no handler.

## Pieces

| Where | What |
|---|---|
| `App.tsx` | `AppProviders` (TanStack Query, `LinkProvider` so kit links navigate client-side) and the router |
| `layouts/TabLayout` | Tab bar screens: `/today`, `/path`, `/practice`, `/words`, `/me` |
| `layouts/FullScreenLayout` | Everything else: `/`, `/sign-up`, `/sign-in`, `/onboarding`, `/chapter/:chapterId`, `/read/:textId`, `/review`, `/review/done`, `/streak` |
| `layouts/RequireSession` | Sends signed-out users to `/`; wraps every route except `/` |
| `lib/session.ts` | `useSession()` returns `{ status: 'loading' \| 'signed-in' \| 'signed-out', user, signOut }`. Reads Better Auth's `/api/auth/get-session` through TanStack Query. In mock mode the auth mock starts signed in as Léa (`mocks/handlers/auth.ts`; sign out to see the welcome flow) |
| `/dev/ui` | The UI kit gallery, development builds only |

## Mocks on and off

MSW runs in the browser when `VITE_USE_MOCKS=true`, and by default in `npm run dev` (set `VITE_USE_MOCKS=false` to talk to the real Worker). It is off in production builds. Vitest always starts it (`test-setup.ts`).

The service worker script is `public/mockServiceWorker.js`. After upgrading `msw`, refresh it with `npx msw init public --no-save`.
