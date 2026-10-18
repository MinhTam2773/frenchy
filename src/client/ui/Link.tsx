import {
  createContext,
  createElement,
  useContext,
  type ComponentProps,
  type ComponentType,
} from 'react';

export type LinkProps = Omit<ComponentProps<'a'>, 'href'> & { to: string };

function AnchorLink({ to, children, ...rest }: LinkProps) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

// The kit has no router. T-09 wraps the app in <LinkProvider value={RouterLink}> so every
// `to` becomes client-side navigation without the kit importing react-router.
const LinkContext = createContext<ComponentType<LinkProps>>(AnchorLink);

export const LinkProvider = LinkContext.Provider;

export function Link(props: LinkProps) {
  return createElement(useContext(LinkContext), props);
}
