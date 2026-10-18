import { describe, expect, test } from 'vitest';
import { ExplainResponse } from '../../shared/schemas';
import { providerFor } from './config';
import { ANTHROPIC_MODEL, anthropicModel, mockModel, openAiCompatibleModel } from './drivers';
import { AiConfigError, AiUpstreamError, type Completion } from './types';

const REQUEST: Completion = {
  system: 'Translate.',
  messages: [{ role: 'user', content: '{"text":"Bonjour"}' }],
};

/** Stands in for the network: records the request, answers with `body`. Nothing leaves the test. */
function fakeFetch(body: unknown, status = 200) {
  const seen: { url: string; init: RequestInit }[] = [];
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetchFn: fetchFn as typeof fetch, seen };
}

function headerOf(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name);
}

describe('anthropic driver', () => {
  const message = (overrides: object = {}) => ({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: ANTHROPIC_MODEL,
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: 'Hello' },
    ],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 2 },
    ...overrides,
  });

  test('sends the model, low effort, system and messages, and returns the text blocks', async () => {
    const { fetchFn, seen } = fakeFetch(message());
    expect(await anthropicModel('test-key', fetchFn).complete(REQUEST)).toBe('Hello');
    const [call] = seen;
    expect(call?.url).toMatch(/\/v1\/messages$/);
    expect(call && headerOf(call.init, 'x-api-key')).toBe('test-key');
    const body = JSON.parse(String(call?.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'claude-haiku-5-5',
      output_config: { effort: 'low' },
      system: REQUEST.system,
      messages: REQUEST.messages,
    });
  });

  test('a refusal or an API error becomes an upstream error', async () => {
    const refusal = fakeFetch(message({ stop_reason: 'refusal', content: [] }));
    await expect(anthropicModel('k', refusal.fetchFn).complete(REQUEST)).rejects.toThrow(
      AiUpstreamError,
    );
    const denied = fakeFetch(
      { type: 'error', error: { type: 'authentication_error', message: 'bad key' } },
      401,
    );
    await expect(anthropicModel('k', denied.fetchFn).complete(REQUEST)).rejects.toThrow(
      AiUpstreamError,
    );
  });
});

describe('openai-compatible driver', () => {
  const config = { baseUrl: 'https://llm.example/v1/', apiKey: 'test-key', model: 'some-model' };

  test('posts chat/completions with the system prompt first and returns the message', async () => {
    const { fetchFn, seen } = fakeFetch({ choices: [{ message: { content: 'Hello' } }] });
    const model = openAiCompatibleModel(config, fetchFn);
    expect(model.name).toBe('openai-compatible:some-model');
    expect(await model.complete(REQUEST)).toBe('Hello');
    const [call] = seen;
    expect(call?.url).toBe('https://llm.example/v1/chat/completions');
    expect(call && headerOf(call.init, 'authorization')).toBe('Bearer test-key');
    expect(JSON.parse(String(call?.init.body))).toMatchObject({
      model: 'some-model',
      messages: [{ role: 'system', content: 'Translate.' }, ...REQUEST.messages],
    });
  });

  test('an HTTP error or a reply without a message becomes an upstream error', async () => {
    const failing = fakeFetch({ error: 'nope' }, 500);
    await expect(openAiCompatibleModel(config, failing.fetchFn).complete(REQUEST)).rejects.toThrow(
      AiUpstreamError,
    );
    const empty = fakeFetch({ choices: [] });
    await expect(openAiCompatibleModel(config, empty.fetchFn).complete(REQUEST)).rejects.toThrow(
      AiUpstreamError,
    );
  });
});

describe('mock driver', () => {
  test('answers translate and explain prompts with well-formed placeholders', async () => {
    expect(await mockModel.complete(REQUEST)).toBe('[mock] Bonjour');
    const explained = await mockModel.complete({
      system: '',
      messages: [{ role: 'user', content: JSON.stringify({ sentence: 'J’aime le thé.' }) }],
    });
    const parsed = ExplainResponse.parse(JSON.parse(explained));
    expect(parsed.gloss.map((pair) => pair.fr)).toEqual(['J’aime', 'le', 'thé']);
  });
});

describe('providerFor', () => {
  test('routes each task by its own env var, defaulting to mock', () => {
    const env = {
      AI_EXPLAIN_PROVIDER: 'openai-compatible',
      OPENAI_COMPATIBLE_BASE_URL: 'https://llm.example/v1',
      OPENAI_COMPATIBLE_API_KEY: 'k',
      OPENAI_COMPATIBLE_MODEL: 'some-model',
    };
    expect(providerFor(env, 'translate').name).toBe('mock');
    expect(providerFor(env, 'explain').name).toBe('openai-compatible:some-model');
    expect(
      providerFor({ AI_TRANSLATE_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }, 'translate').name,
    ).toBe(`anthropic:${ANTHROPIC_MODEL}`);
  });

  test('a missing key or an unknown driver is a config error', () => {
    expect(() => providerFor({ AI_TRANSLATE_PROVIDER: 'anthropic' }, 'translate')).toThrow(
      AiConfigError,
    );
    expect(() => providerFor({ AI_EXPLAIN_PROVIDER: 'openai-compatible' }, 'explain')).toThrow(
      AiConfigError,
    );
    expect(() => providerFor({ AI_EXPLAIN_PROVIDER: 'ollama' }, 'explain')).toThrow(AiConfigError);
  });
});
