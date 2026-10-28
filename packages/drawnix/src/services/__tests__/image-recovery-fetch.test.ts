import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchImageRecovery } from '../image-recovery-fetch';

afterEach(() => vi.unstubAllGlobals());

describe('desktop image recovery transport', () => {
  it('passes the original URL and bearer credential to the restricted native command', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 200, body: '{"status":"succeeded"}' });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke } });
    const response = await fetchImageRecovery('https://api.tu-zi.com/log/get-request?id=attempt', {
      headers: { Authorization: 'Bearer fictional-key' },
    });
    expect(await response.json()).toEqual({ status: 'succeeded' });
    expect(invoke).toHaveBeenCalledWith('query_image_recovery', {
      url: 'https://api.tu-zi.com/log/get-request?id=attempt', authorization: 'Bearer fictional-key',
    });
  });

  it('preserves authentication failures for the caller', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke: vi.fn().mockResolvedValue({ status: 401, body: '{}' }) } });
    const response = await fetchImageRecovery('https://api.tu-zi.com/log/get-request?id=attempt');
    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });
});
