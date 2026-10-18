// Loads the demo user into the local D1 (`npm run db:seed:local`, after `db:migrate:local`).
import { getPlatformProxy } from 'wrangler';
import { createDb } from '../../src/worker/db/index';
import { DEMO_LOGIN, DEMO_USER_ID, seedDemo } from '../../src/worker/db/seed';

const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>();
try {
  const data = await seedDemo(createDb(env.DB));
  console.log(
    `Seeded ${DEMO_USER_ID}: ${data.cards.length} cards, ${data.activity.length} activity days, ${data.words.length} words`,
  );
  console.log(`Sign in with ${DEMO_LOGIN.email} / ${DEMO_LOGIN.password}`);
} finally {
  await dispose();
}
