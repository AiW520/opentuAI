import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchModelDiscovery } from '../model-discovery-fetch';
afterEach(() => { delete (window as any).__TAURI_INTERNALS__; vi.unstubAllGlobals(); });
describe('desktop model discovery transport', () => {
  it('keeps web requests and their cancellation signal unchanged', async () => {
    const response = new Response('{}'); const fetcher = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetcher);
    const init = { signal: new AbortController().signal };
    expect(await fetchModelDiscovery('/proxy/models', init)).toBe(response);
    expect(fetcher).toHaveBeenCalledWith('/proxy/models', init);
  });
  it('uses native metadata GET and preserves HTTP authentication failures', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 401, body: '{"error":{"message":"Invalid token"}}', content_type: 'application/json' });
    (window as any).__TAURI_INTERNALS__ = { invoke };
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await fetchModelDiscovery('https://provider.test/v1/models', { headers: { Authorization: 'Bearer test-key' } }, 15000);
    expect(response.status).toBe(401); expect((await response.json()).error.message).toBe('Invalid token');
    expect(invoke).toHaveBeenCalledWith('query_model_list', { url: 'https://provider.test/v1/models', authorization: 'Bearer test-key', googleApiKey: null, timeoutMs: 15000 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not add a saved key to public metadata', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 200, body: '{}', content_type: 'application/json' });
    (window as any).__TAURI_INTERNALS__ = { invoke };
    await fetchModelDiscovery('https://api.tu-zi.com/api/pricing', {}, 20000);
    expect(invoke.mock.calls[0][1]).toMatchObject({ authorization: null, googleApiKey: null, timeoutMs: 20000 });
  });
  it('cancels the UI wait even while a native request is pending', async () => {
    const invoke = vi.fn().mockReturnValue(new Promise(() => {})); (window as any).__TAURI_INTERNALS__ = { invoke };
    const controller = new AbortController();
    const pending = fetchModelDiscovery('https://provider.test/v1/models', { signal: controller.signal });
    controller.abort(); await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(fetchModelDiscovery('https://provider.test/v1/models', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('reports native failures and rejects redirects without browser fallback', async () => {
    const invoke = vi.fn().mockRejectedValueOnce('无法连接模型接口').mockResolvedValueOnce({ status: 302, body: '', content_type: '' });
    (window as any).__TAURI_INTERNALS__ = { invoke };
    await expect(fetchModelDiscovery('https://provider.test/v1/models')).rejects.toThrow('无法连接模型接口');
    await expect(fetchModelDiscovery('https://provider.test/v1/models')).rejects.toThrow('重定向');
  });
});
