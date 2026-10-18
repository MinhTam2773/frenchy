import { Outlet } from 'react-router';

/** Screens without the tab bar: welcome, onboarding, chapter, reader, review, streak. */
export function FullScreenLayout() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] bg-ground">
      <Outlet />
    </main>
  );
}
