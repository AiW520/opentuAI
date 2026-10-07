import { describe, expect, it } from 'vitest';
import { extractTuziGeneratedImageUrls } from '../tuzi-log-media';

describe('extractTuziGeneratedImageUrls', () => {
  const apiBaseUrl = 'https://api.tu-zi.com';

  it('uses only user-visible canonical delivery entries', () => {
    expect(
      extractTuziGeneratedImageUrls(
        {
          generated_image_urls: ['https://stale.example.com/result.png'],
          generated_image_delivery: {
            status: 'completed',
            entries: [
              {
                url: 'https://private.example.com/result.png',
                shown_to_user: false,
              },
              { url: '/ximg/result.png', shown_to_user: true },
            ],
          },
        },
        apiBaseUrl
      )
    ).toEqual(['https://api.tu-zi.com/ximg/result.png']);
  });

  it('falls back to legacy generated-result fields and removes duplicates', () => {
    expect(
      extractTuziGeneratedImageUrls(
        {
          request_image_urls: ['https://example.com/reference.png'],
          generated_image_urls: [
            'https://example.com/result.png',
            'https://example.com/result.png',
          ],
          generated_image_url: 'https://example.com/second.webp',
        },
        apiBaseUrl
      )
    ).toEqual([
      'https://example.com/result.png',
      'https://example.com/second.webp',
    ]);
  });

  it('keeps absolute URLs when no API base URL is configured', () => {
    expect(
      extractTuziGeneratedImageUrls(
        {
          generated_image_urls: [
            'https://example.com/result.png',
            '/ximg/relative.png',
          ],
        },
        ''
      )
    ).toEqual(['https://example.com/result.png']);
  });

  it('rejects credentials, protocol-relative URLs, data URLs, and invalid values', () => {
    expect(
      extractTuziGeneratedImageUrls(
        {
          generated_image_urls: [
            'https://user:secret@example.com/result.png',
            '//evil.example.com/result.png',
            'data:image/png;base64,secret',
            'ftp://example.com/result.png',
            42,
          ],
        },
        apiBaseUrl
      )
    ).toEqual([]);
  });

  it('does not fall back when canonical delivery has no visible result', () => {
    expect(
      extractTuziGeneratedImageUrls(
        {
          generated_image_urls: ['https://diagnostic.example.com/result.png'],
          generated_image_delivery: {
            status: 'completed',
            entries: [
              {
                url: 'https://diagnostic.example.com/result.png',
                shown_to_user: false,
              },
            ],
          },
        },
        apiBaseUrl
      )
    ).toEqual([]);
  });
});
