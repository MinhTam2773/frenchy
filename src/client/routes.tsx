import type { RouteObject } from 'react-router';
import { SignInPage, SignUpPage } from '@client/features/auth/EmailAuthPage';
import { WelcomePage } from '@client/features/auth/WelcomePage';
import { ChapterPage } from '@client/features/chapter/ChapterPage';
import { NotFoundPage } from '@client/features/not-found/NotFoundPage';
import { OnboardingPage } from '@client/features/onboarding/OnboardingPage';
import { PathPage } from '@client/features/path/PathPage';
import { PracticePage } from '@client/features/practice/PracticePage';
import { SettingsPage } from '@client/features/settings/SettingsPage';
import { StreakPage } from '@client/features/streak/StreakPage';
import { TodayPage } from '@client/features/today/TodayPage';
import { FullScreenLayout } from '@client/layouts/FullScreenLayout';
import { RequireSession } from '@client/layouts/RequireSession';
import { TabLayout } from '@client/layouts/TabLayout';

// To add or change a screen: replace its page under features/<feature>/. The route already exists.
// Heavy screens load on demand (`lazy`): the page must be a named export.
export const routes: RouteObject[] = [
  {
    // Lazy screens load before first paint on a direct visit; show nothing meanwhile (silences React Router's warning).
    HydrateFallback: () => null,
    children: [
      {
        element: <FullScreenLayout />,
        children: [
          { path: '/', element: <WelcomePage /> },
          { path: '/sign-up', element: <SignUpPage /> },
          { path: '/sign-in', element: <SignInPage /> },
          {
            element: <RequireSession />,
            children: [
              { path: '/onboarding', element: <OnboardingPage /> },
              { path: '/chapter/:chapterId', element: <ChapterPage /> },
              {
                path: '/read/:textId',
                lazy: async () => ({
                  Component: (await import('@client/features/reader/ReaderPage')).ReaderPage,
                }),
              },
              {
                path: '/review',
                lazy: async () => ({
                  Component: (await import('@client/features/review/ReviewPage')).ReviewPage,
                }),
              },
              {
                path: '/review/done',
                lazy: async () => ({
                  Component: (await import('@client/features/review/ReviewDonePage'))
                    .ReviewDonePage,
                }),
              },
              { path: '/streak', element: <StreakPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          {
            element: <TabLayout />,
            children: [
              { path: '/today', element: <TodayPage /> },
              { path: '/path', element: <PathPage /> },
              { path: '/practice', element: <PracticePage /> },
              { path: '/me', element: <SettingsPage /> },
            ],
          },
        ],
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: '/dev/ui',
              lazy: async () => ({ Component: (await import('@client/ui/Gallery')).Gallery }),
            },
          ]
        : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
