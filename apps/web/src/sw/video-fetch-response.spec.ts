import { describe, expect, it, vi } from 'vitest';

import {
  fetchOriginalVideoRequest,
  fetchVideoForCache,
} from './video-fetch-response';

describe('fetchVideoForCache', () => {
  it('returns a cacheable CORS response without changing signed parameters', async () => {
    const response = new Response('video', {
      status: 200,
      headers: { 'Content-Type': 'video/mp4' },
    });
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const url = new URL(
      'https://example.cos.myqcloud.com/video.mp4?sign=abc%2F123&expires=456'
    );

    await expect(fetchVideoForCache(url, fetchImpl)).resolves.toEqual({
      kind: 'cacheable',
      response,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [requestedUrl, options] = fetchImpl.mock.calls[0];
    expect(requestedUrl.toString()).toBe(url.toString());
    expect(options).toEqual({
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'default',
    });
  });

  it('uses the original request path when the server handles ranges', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 206 }));

    await expect(
      fetchVideoForCache(new URL('https://cdn.example.com/video.mp4'), fetchImpl)
    ).resolves.toEqual({ kind: 'direct', corsFailed: false });
  });

  it('uses the original request path when CORS fetch is rejected', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchVideoForCache(new URL('https://cdn.example.com/video.mp4'), fetchImpl)
    ).resolves.toEqual({ kind: 'direct', corsFailed: true });
  });

  it.each([403, 404, 410, 500])(
    'keeps HTTP %s responses as load errors',
    async (status) => {
      const response = new Response(null, { status });
      const fetchImpl = vi.fn().mockResolvedValue(response);

      await expect(
        fetchVideoForCache(
          new URL('https://cdn.example.com/video.mp4'),
          fetchImpl
        )
      ).resolves.toEqual({ kind: 'http-error', response });
    }
  );
});

describe('fetchOriginalVideoRequest', () => {
  it('preserves the original signed URL and range headers', async () => {
    const request = new Request(
      'https://example.cos.myqcloud.com/video.mp4?sign=abc%2F123&expires=456',
      { headers: { Range: 'bytes=1024-' } }
    );
    const response = new Response(null, { status: 206 });
    const fetchImpl = vi.fn().mockResolvedValue(response);

    await expect(fetchOriginalVideoRequest(request, fetchImpl)).resolves.toBe(
      response
    );
    expect(fetchImpl).toHaveBeenCalledWith(request);
    expect(request.url).toContain('sign=abc%2F123');
    expect(request.headers.get('range')).toBe('bytes=1024-');
  });
});
