import { http, HttpResponse, type RequestHandler } from 'msw';
import { explainRequest } from '@shared/fixtures';
import { ExplainRequest, type ExplainResponse } from '@shared/schemas';

// The base mock answers every sentence with the café fixture; in the reader that would put the
// café note under every sentence. Other sentences get a neutral reply in the same shape.
export const handlers: RequestHandler[] = [
  http.post('/api/ai/explain', async ({ request }) => {
    const body = ExplainRequest.safeParse(await request.clone().json());
    if (!body.success || body.data.sentence === explainRequest.sentence) return;
    const words = body.data.sentence.match(/[\p{L}’'-]+/gu) ?? [body.data.sentence];
    const reply: ExplainResponse = {
      translation: `(mock translation) ${body.data.sentence}`,
      gloss: words.map((fr) => ({ fr, en: '…' })),
      notes: ['Mock grammar note: the real one comes from /api/ai/explain (T-23).'],
    };
    return HttpResponse.json(reply);
  }),
];
