import { Outlet, useLocation } from 'react-router';
import { MAIN_TABS, TabBar } from '@client/ui';
import { OfflineBanner } from './OfflineBanner';

// The Words screen is Phase 2 (B-02, G-28).
const MVP_TABS = MAIN_TABS.filter((tab) => tab.to !== '/words');

/** Screens with the bottom tab bar: Today, Path, Practice, Me. */
export function TabLayout() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-ground">
      <OfflineBanner />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TabBar current={pathname} items={MVP_TABS} />
    </div>
  );
}
