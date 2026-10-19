import { anthropicModel, mockModel, openAiCompatibleModel } from './drivers';
import { createProvider } from './provider';
import { AiConfigError, type AiProvider, type TextModel } from './types';

/** Worker vars and secrets for AI (H-04). Keys are secrets: `wrangler secret put`, never the client. */
export interface AiSettings {
  /** `anthropic`, `openai-compatible` or `mock`. Unset: `mock`. */
  AI_TRANSLATE_PROVIDER?: string;
  AI_EXPLAIN_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_COMPATIBLE_BASE_URL?: string;
  OPENAI_COMPATIBLE_API_KEY?: string;
  OPENAI_COMPATIBLE_MODEL?: string;
  /** Provider calls per UTC day for the whole app (a var, not a secret). Unset: the default. */
  AI_DAILY_LIMIT?: string;
}

export type AiTask = 'translate' | 'explain';

const PROVIDER_VAR = {
  translate: 'AI_TRANSLATE_PROVIDER',
  explain: 'AI_EXPLAIN_PROVIDER',
} as const satisfies Record<AiTask, keyof AiSettings>;

/** The provider the env routes `task` to. Throws `AiConfigError` when it can't be built. */
export function providerFor(env: AiSettings, task: AiTask): AiProvider {
  return createProvider(modelFor(env, env[PROVIDER_VAR[task]] || 'mock'));
}

function modelFor(env: AiSettings, driver: string): TextModel {
  switch (driver) {
    case 'mock':
      return mockModel;
    case 'anthropic':
      if (!env.ANTHROPIC_API_KEY) throw new AiConfigError('ANTHROPIC_API_KEY is not set');
      return anthropicModel(env.ANTHROPIC_API_KEY);
    case 'openai-compatible': {
      const {
        OPENAI_COMPATIBLE_BASE_URL: baseUrl,
        OPENAI_COMPATIBLE_API_KEY: apiKey,
        OPENAI_COMPATIBLE_MODEL: model,
      } = env;
      if (!baseUrl || !apiKey || !model) {
        throw new AiConfigError('OPENAI_COMPATIBLE_BASE_URL, _API_KEY and _MODEL must all be set');
      }
      return openAiCompatibleModel({ baseUrl, apiKey, model });
    }
    default:
      throw new AiConfigError(`Unknown AI provider "${driver}"`);
  }
}
