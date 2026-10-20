import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { hardenApi } from './middleware/harden-api';
import { accountRoute } from './routes/account';
import { activityRoute, streakRoute } from './routes/activity';
import { ai } from './routes/ai';
import { auth } from './routes/auth';
import { cardsRoute } from './routes/cards';
import { health } from './routes/health';
import { profile } from './routes/profile';
import { reviewsRoute } from './routes/reviews';
import { wordsRoute } from './routes/words';

// Mount each feature with one `.route()` line; keep the chain so AppType carries every route.
export const app = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  // On top of the SameSite=Lax cookie: a form-type write must come from our own origin (T-29).
  .use(csrf())
  .use(hardenApi)
  .route('/health', health)
  .route('/auth', auth)
  .route('/ai', ai)
  .route('/account', accountRoute)
  .route('/profile', profile)
  .route('/cards', cardsRoute)
  .route('/reviews', reviewsRoute)
  .route('/words', wordsRoute)
  .route('/activity', activityRoute)
  .route('/streak', streakRoute);

export type AppType = typeof app;

export default app;
