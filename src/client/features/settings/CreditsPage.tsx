import type { ReactNode } from 'react';
import { TopBar } from '@client/ui';

const linkClass = 'inline-flex min-h-11 min-w-11 items-center font-bold text-primary underline underline-offset-2';
const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

function Attribution({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-card border-2 border-line bg-surface px-3.5 py-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p>{children}</p>
    </section>
  );
}

// The wording is fixed by docs/LICENSES.md; change both together.
export function CreditsPage() {
  return (
    <>
      <TopBar title="Credits" nav={{ icon: 'back', label: 'Back', to: '/me' }} />
      <div className="flex flex-col gap-3 px-4 pt-3 pb-6">
        <p className="text-ink-2">
          Frenchy’s offline dictionary is built from open data. Thank you to the people who made it.
        </p>
        <Attribution title="Dictionary">
          Dictionary data from{' '}
          <ExternalLink href="https://en.wiktionary.org/">Wiktionary</ExternalLink> contributors,
          extracted by <ExternalLink href="https://kaikki.org/">kaikki.org</ExternalLink>{' '}
          (wiktextract, Tatu Ylonen), licensed{' '}
          <ExternalLink href={CC_BY_SA}>CC BY-SA 4.0</ExternalLink>. Modified.
        </Attribution>
        <Attribution title="Word frequencies">
          Word frequencies from{' '}
          <ExternalLink href="http://www.lexique.org/">Lexique 3.83</ExternalLink> (Boris New,
          Christophe Pallier et al.), licensed{' '}
          <ExternalLink href={CC_BY_SA}>CC BY-SA 4.0</ExternalLink>.
        </Attribution>
      </div>
    </>
  );
}
