import { Hono } from 'hono';
import { auth } from './routes/auth';
import { cardsRoute } from './routes/cards';
import { health } from './routes/health';
import { profile } from './routes/profile';

// Mount each feature with one `.route()` line; keep the chain so AppType carries every route.
export const app = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  .route('/health', health)
  .route('/auth', auth)
  .route('/profile', profile)
  .route('/cards', cardsRoute);

export type AppType = typeof app;

export default app;
