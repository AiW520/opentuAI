import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateImageDirect, normalizeAspectRatio, sendChatWithGemini } from './services';
import { providerTransport, readProviderResponseJson } from '../../services/provider-routing';

const mocks = vi.hoisted(() => ({
  callApiWithRetry: vi.fn(),
  callGoogleGenerateContentRaw: vi.fn(),
}));

vi.mock('./apiCalls', () => ({
  callApiWithRetry: mocks.callApiWithRetry,
  callApiStreamRaw: vi.fn(),
  callGoogleGenerateContentRaw: mocks.callGoogleGenerateContentRaw,
  callVideoApiStreamRaw: vi.fn(),
}));

vi.mock('../settings-manager', () => ({
  resolveInvocationRoute: vi.fn(() => ({
    apiKey: 'secret',
    baseUrl: 'https://api.example.com',
    modelId: 'text-model',
    providerType: 'custom',
  })),
  settingsManager: {
    waitForInitialization: vi.fn(async () => undefined),
  },
}));

vi.mock('../../services/provider-routing', () => ({
  providerTransport: { send: vi.fn() },
  readProviderResponseJson: vi.fn(),
  readProviderResponseText: vi.fn(),
  resolveInvocationPlanFromRoute: vi.fn(() => null),
}));

vi.mock('./auth', () => ({
  validateAndEnsureConfig: vi.fn(async (config) => config),
}));

vi.mock('../../services/media-executor/llm-api-logger', () => ({
  startLLMApiLog: vi.fn(() => 'log-1'),
  completeLLMApiLog: vi.fn(),
  failLLMApiLog: vi.fn(),
}));

describe('normalizeAspectRatio', () => {
  it('preserves canonical Gemini aspect ratio enums', () => {
    expect(normalizeAspectRatio('21x9')).toBe('21:9');
    expect(normalizeAspectRatio('16x9')).toBe('16:9');
    expect(normalizeAspectRatio('9x16')).toBe('9:16');
  });

  it('normalizes pixel sizes to reduced aspect ratios', () => {
    expect(normalizeAspectRatio('1280x720')).toBe('16:9');
    expect(normalizeAspectRatio('1024x1792')).toBe('4:7');
  });

  it('returns ratio strings as-is', () => {
    expect(normalizeAspectRatio('21:9')).toBe('21:9');
    expect(normalizeAspectRatio('auto')).toBeUndefined();
  });
});

describe('sendChatWithGemini', () => {
  beforeEach(() => {
    mocks.callApiWithRetry.mockReset();
    mocks.callApiWithRetry.mockResolvedValue({
      choices: [
        {
          message: { role: 'assistant', content: '{"title":"outline"}' },
        },
      ],
    });
  });

  it('forwards AbortSignal to non-stream text requests', async () => {
    const controller = new AbortController();
    const messages = [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'build a PPT outline' }],
      },
    ];

    await sendChatWithGemini(
      messages,
      undefined,
      controller.signal,
      'text-model'
    );

    expect(mocks.callApiWithRetry).toHaveBeenCalledWith(
      expect.any(Object),
      messages,
      controller.signal
    );
  });
});

describe('Nano Banana 2.1 generateContent', () => {
  const config = {
    baseUrl: 'https://api.tu-zi.com/v1',
    apiKey: 'test-key',
    modelName: 'gemini-nano-banana-2.1',
    protocol: 'google.generateContent' as const,
  };

  beforeEach(() => {
    mocks.callGoogleGenerateContentRaw.mockReset();
    mocks.callGoogleGenerateContentRaw.mockResolvedValue({
      choices: [{ message: { content: 'https://example.com/final.jpg' } }],
    });
  });

  it('forwards references, resolution, ratio, and Thinking', async () => {
    const images = Array.from(
      { length: 14 },
      (_, index) => `https://example.com/ref-${index}.png`
    );
    const result = await generateImageDirect(
      'edit',
      { image: images, size: '1x8', quality: '4k', thinking: 'high' },
      config.modelName,
      undefined,
      config
    );

    const [, messages, options] =
      mocks.callGoogleGenerateContentRaw.mock.calls[0];
    expect(messages[0].content).toHaveLength(15);
    expect(options.generationConfig).toEqual({
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: '1:8', imageSize: '4K' },
      thinkingConfig: { thinkingLevel: 'high' },
    });
    expect(result.data).toEqual([{ url: 'https://example.com/final.jpg' }]);
  });

  it('defaults to 1K and medium Thinking', async () => {
    await generateImageDirect(
      'draw',
      { size: 'auto' },
      config.modelName,
      undefined,
      config
    );
    expect(
      mocks.callGoogleGenerateContentRaw.mock.calls[0][2].generationConfig
    ).toEqual({
      responseModalities: ['IMAGE'],
      imageConfig: { imageSize: '1K' },
      thinkingConfig: { thinkingLevel: 'medium' },
    });
  });

  it('rejects more than 14 references before submission', async () => {
    await expect(
      generateImageDirect(
        'edit',
        { image: Array(15).fill('https://example.com/ref.png') },
        config.modelName,
        undefined,
        config
      )
    ).rejects.toThrow('14');
    expect(mocks.callGoogleGenerateContentRaw).not.toHaveBeenCalled();
  });

  it('infers a fixed Gemini tier while preserving request identity and cancellation', async () => {
    const controller = new AbortController();
    const model = 'gemini-3.1-flash-image-preview-4k';
    await generateImageDirect('draw', { size: '16x9', requestId: 'request-123', signal: controller.signal }, model, undefined, { ...config, modelName: model });
    const options = mocks.callGoogleGenerateContentRaw.mock.calls[0][2];
    expect(options.generationConfig.imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '4K' });
    expect(options.requestId).toBe('request-123');
    expect(options.signal).toBe(controller.signal);
  });

  it('sends the chosen tier and dimensions through an OpenAI-compatible provider', async () => {
    vi.mocked(providerTransport.send).mockResolvedValue({ ok: true } as Response);
    vi.mocked(readProviderResponseJson).mockResolvedValue({ data: [{ url: 'https://example.com/image.png' }] });
    const model = 'gemini-3.1-flash-image-preview-4k';
    const controller = new AbortController();
    await generateImageDirect('draw', { size: '16x9', quality: '2k', requestId: 'request-456', signal: controller.signal }, model, undefined, { ...config, protocol: 'openai.images' as never, modelName: model });
    const request = vi.mocked(providerTransport.send).mock.calls.at(-1)![1];
    expect(JSON.parse(request.body as string)).toMatchObject({ model, size: '2048x1152', quality: '2k' });
    expect(request.requestId).toBe('request-456');
    expect(request.signal).toBe(controller.signal);
  });
});
