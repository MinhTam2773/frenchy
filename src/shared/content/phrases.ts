/**
 * The closed list of fixed multi-word phrases (T-24, L-95). Every word of one carries the whole
 * phrase as `lemma` and pos `phrase`; everything else is annotated word by word. To add one, edit
 * this list: `content:check` and the chapter brief (`scripts/content/prompts/text.md`) follow it.
 */
export const PHRASES: readonly string[] = [
  "s'il vous plaît",
  'au revoir',
  'il y a',
  "d'accord",
  'bonne journée',
  'est-ce que',
  "qu'est-ce que",
  "à tout à l'heure",
  'un peu',
  'merci beaucoup',
  'pas de problème',
  'avec plaisir',
  'pourquoi pas',
];
