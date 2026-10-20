import { z } from 'zod';

/** What the user must type, so a stray or scripted `DELETE /api/account` can't remove an account. */
export const ACCOUNT_DELETE_CONFIRMATION = 'delete';

/** `DELETE /api/account` body. */
export const AccountDeleteInput = z.object({ confirm: z.literal(ACCOUNT_DELETE_CONFIRMATION) });
export type AccountDeleteInput = z.infer<typeof AccountDeleteInput>;

export const AccountDeleted = z.object({ deleted: z.literal(true) });
export type AccountDeleted = z.infer<typeof AccountDeleted>;

/**
 * `GET /api/account/export`: the user's name and email, plus every row of every table that has a
 * `user_id` column, keyed by table name. Rows use the field names of our own tables (camelCase).
 * Session tokens and password hashes are not included.
 */
export const AccountExport = z.object({
  exportedAt: z.number().int(),
  user: z.object({ id: z.string().min(1), name: z.string(), email: z.string() }),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type AccountExport = z.infer<typeof AccountExport>;
