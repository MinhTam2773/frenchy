import type { ComponentProps } from 'react';
import { Link } from './Link';

type AsButton = ComponentProps<'button'> & { to?: undefined; href?: undefined };
type AsRouterLink = Omit<ComponentProps<'a'>, 'href'> & { to: string; href?: undefined };
type AsAnchor = Omit<ComponentProps<'a'>, 'href'> & { href: string; to?: undefined };

export type PressableProps = AsButton | AsRouterLink | AsAnchor;

/** A <button>, or a link when given `to` (in-app) or `href` (external). */
export function Pressable(props: PressableProps) {
  if (props.to !== undefined) return <Link {...props} to={props.to} />;
  if (props.href !== undefined)
    return (
      <a {...props} href={props.href}>
        {props.children}
      </a>
    );
  return <button type="button" {...props} />;
}
