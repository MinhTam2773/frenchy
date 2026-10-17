import { Hono } from 'hono';
import { health } from './routes/health';

// Mount each feature with one `.route()` line; keep the chain so AppType carries every route.
export const app = new Hono<{ Bindings: Env }>().basePath('/api').route('/health', health);

export type AppType = typeof app;

export default app;
