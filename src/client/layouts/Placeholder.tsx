/** What every route shows until its screen task replaces the page. Delete a use when you build the screen. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-muted">Placeholder screen.</p>
    </div>
  );
}
