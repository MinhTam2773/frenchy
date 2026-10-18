import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { AiUpstreamError, type Completion, type TextModel } from './types';

/** PLAN §4: sentence translation and explanation use a fast, cheap (Haiku-class) model. */
export const ANTHROPIC_MODEL = 'claude-haiku-5-5';

// A reader waits on these calls, so fail fast rather than after the SDK's 10-minute default.
const TIMEOUT_MS = 20_000;
// Generous: thinking counts toward it, and only the tokens used are billed.
const MAX_TOKENS = 8_000;

type Fetch = typeof fetch;

export function anthropicModel(apiKey: string, fetchFn?: Fetch): TextModel {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1, fetch: fetchFn });
  return {
    name: `anthropic:${ANTHROPIC_MODEL}`,
    async complete({ system, messages }) {
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_TOKENS,
          // Short, well-specified tasks: low effort keeps latency and thinking tokens down.
          output_config: { effort: 'low' },
          system,
          messages,
        });
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new AiUpstreamError(`Anthropic API error ${error.status ?? ''}: ${error.message}`);
        }
        throw error;
      }
      if (response.stop_reason === 'refusal') throw new AiUpstreamError('Anthropic declined');
      return response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('');
    },
  };
}

const Choice = z.object({ message: z.object({ content: z.string() }) });
const ChatCompletion = z.object({ choices: z.tuple([Choice], Choice) });

/** Any endpoint that speaks OpenAI's `POST /chat/completions` (OpenRouter, Groq, Gemini, …). */
export function openAiCompatibleModel(
  config: { baseUrl: string; apiKey: string; model: string },
  fetchFn: Fetch = fetch,
): TextModel {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  return {
    name: `openai-compatible:${config.model}`,
    async complete({ system, messages }) {
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: MAX_TOKENS,
            messages: [{ role: 'system', content: system }, ...messages],
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        throw new AiUpstreamError(`OpenAI-compatible request failed: ${String(error)}`);
      }
      if (!response.ok) {
        throw new AiUpstreamError(`OpenAI-compatible API error ${response.status}`);
      }
      const parsed = ChatCompletion.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new AiUpstreamError('OpenAI-compatible reply has no message');
      return parsed.data.choices[0].message.content;
    },
  };
}

/**
 * No network, no key: obviously fake but well-formed answers, so local dev and tests run
 * without H-04. It reads the JSON the prompts send (`text` for translate, `sentence` for explain).
 */
export const mockModel: TextModel = {
  name: 'mock',
  async complete({ messages }: Completion) {
    const last = messages.at(-1)?.content ?? '';
    const data = parseJsonObject(last);
    if (typeof data?.sentence === 'string') {
      const words = data.sentence.match(/[\p{L}\p{N}’'-]+/gu) ?? [data.sentence];
      return JSON.stringify({
        translation: `[mock] ${data.sentence}`,
        gloss: words.map((fr) => ({ fr, en: `[mock] ${fr}` })),
        notes: ['[mock] No AI provider is configured, so this is a placeholder.'],
      });
    }
    if (typeof data?.text === 'string') return `[mock] ${data.text}`;
    return `[mock] ${last}`;
  },
};

function parseJsonObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
