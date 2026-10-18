import { z } from 'zod';
import { ExplainResponse, TranslateResponse } from '../../shared/schemas';
import {
  chatSystem,
  explainPrompt,
  explainRetry,
  explainSystem,
  learnerLevel,
  TRANSLATE_SYSTEM,
  translatePrompt,
} from './prompts';
import { AiConfigError, AiUpstreamError, type AiProvider, type TextModel } from './types';

/** Prompts, parsing and validation on top of any driver, so every provider behaves the same. */
export function createProvider(model: TextModel): AiProvider {
  return {
    name: model.name,

    async translate(text) {
      const reply = await model.complete({
        system: TRANSLATE_SYSTEM,
        messages: [{ role: 'user', content: translatePrompt(text) }],
      });
      const parsed = TranslateResponse.safeParse({ translation: reply.trim() });
      if (!parsed.success) throw new AiUpstreamError(`${model.name} returned an empty translation`);
      return parsed.data;
    },

    async explain(sentence, chapterId) {
      const level = learnerLevel(chapterId);
      if (!level) throw new AiConfigError(`Unknown chapter "${chapterId}"`);
      const system = explainSystem(level);
      const messages = [{ role: 'user' as const, content: explainPrompt(sentence) }];

      const first = await model.complete({ system, messages });
      const firstTry = parseExplain(first);
      if (firstTry.success) return firstTry.data;

      // One retry, showing the model its own reply and what was wrong with it.
      const second = await model.complete({
        system,
        messages: [
          ...messages,
          { role: 'assistant', content: first },
          { role: 'user', content: explainRetry(firstTry.problem) },
        ],
      });
      const secondTry = parseExplain(second);
      if (secondTry.success) return secondTry.data;
      throw new AiUpstreamError(`${model.name} returned invalid JSON twice: ${secondTry.problem}`);
    },

    async chat(messages, chapterId) {
      const level = learnerLevel(chapterId);
      if (!level) throw new AiConfigError(`Unknown chapter "${chapterId}"`);
      const reply = (await model.complete({ system: chatSystem(level), messages })).trim();
      if (!reply) throw new AiUpstreamError(`${model.name} returned an empty reply`);
      return reply;
    },
  };
}

type ParseResult = { success: true; data: ExplainResponse } | { success: false; problem: string };

/** Accepts the object alone or wrapped in a code fence or a sentence, as models sometimes do. */
export function parseExplain(reply: string): ParseResult {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start === -1 || end < start) return { success: false, problem: 'no JSON object found' };
  let json: unknown;
  try {
    json = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return { success: false, problem: 'the JSON does not parse' };
  }
  const parsed = ExplainResponse.safeParse(json);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, problem: z.prettifyError(parsed.error).replaceAll('\n', '; ') };
}
