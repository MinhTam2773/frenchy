import { Outlet, useLocation } from 'react-router';
import { TabBar } from '@client/ui';

/** Screens with the bottom tab bar: Today, Path, Practice, Words, Me. */
export function TabLayout() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-ground">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TabBar current={pathname} />
    </div>
  );
}
