import { AccountDeleted, AccountDeleteInput, AccountExport } from '../../shared/schemas';
import { parseInput, readJson, respond, syncRouter, userDb } from './sync-common';

export const accountRoute = syncRouter()
  .get('/export', async (c) => {
    const { id, name, email } = c.var.user;
    const now = Date.now();
    const tables = await userDb(c).exportAll();
    c.header('cache-control', 'no-store');
    c.header(
      'content-disposition',
      `attachment; filename="frenchy-export-${new Date(now).toISOString().slice(0, 10)}.json"`,
    );
    return respond(c, AccountExport, { exportedAt: now, user: { id, name, email }, tables });
  })
  .delete('/', async (c) => {
    parseInput(AccountDeleteInput, await readJson(c), 'body');
    await userDb(c).deleteAccount();
    return respond(c, AccountDeleted, { deleted: true });
  });
