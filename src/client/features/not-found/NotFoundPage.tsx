import { Button } from '@client/ui';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-start gap-4 p-4">
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <Button to="/today">Back to Today</Button>
    </main>
  );
}
