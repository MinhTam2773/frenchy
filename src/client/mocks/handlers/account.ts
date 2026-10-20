import { http, HttpResponse, type RequestHandler } from 'msw';
import { profile } from '@shared/fixtures';
import { AccountDeleteInput } from '@shared/schemas';
import { setMockSignedIn } from './auth';
import { badBody } from './base';

// Account export and deletion (B-16). Deleting signs the mock user out, like the real session.

export const handlers: RequestHandler[] = [
  http.get('/api/account/export', () =>
    HttpResponse.json({
      exportedAt: Date.now(),
      user: { id: '00000000-0000-4000-8000-0000000000f1', name: 'Léa', email: 'lea@example.com' },
      tables: { profiles: [{ userId: '00000000-0000-4000-8000-0000000000f1', ...profile }] },
    }),
  ),
  http.delete('/api/account', async ({ request }) => {
    const parsed = AccountDeleteInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badBody(parsed.error);
    setMockSignedIn(false);
    return HttpResponse.json({ deleted: true });
  }),
];
