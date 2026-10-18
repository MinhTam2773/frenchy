import type { ChapterId, ExplainResponse, TranslateResponse } from '../../shared/schemas';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Completion {
  system: string;
  messages: ChatMessage[];
}

/** One driver: a single model call, text in and text out. Prompts and validation live above it. */
export interface TextModel {
  /** Stored in `translation_cache.provider`, e.g. `anthropic:claude-haiku-5-5`. */
  readonly name: string;
  complete(request: Completion): Promise<string>;
}

/** What routes call. Results are already validated against the shared schemas. */
export interface AiProvider {
  readonly name: string;
  translate(text: string): Promise<TranslateResponse>;
  /** Pitched at the grammar the learner has met up to `chapterId`. */
  explain(sentence: string, chapterId: ChapterId): Promise<ExplainResponse>;
  /** Tutor reply (B-03). Not routed yet. */
  chat(messages: ChatMessage[], chapterId: ChapterId): Promise<string>;
}

/** The provider failed or answered with something unusable: the route answers 502. */
export class AiUpstreamError extends Error {
  override name = 'AiUpstreamError';
}

/** The Worker's AI settings are missing or wrong: the route answers 500. */
export class AiConfigError extends Error {
  override name = 'AiConfigError';
}
