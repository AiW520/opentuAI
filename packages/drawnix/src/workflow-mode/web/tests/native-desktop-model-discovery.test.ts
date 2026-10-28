import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { fetchImageModels } from '../src/services/api/image';
import { fetchTuziModels, tuziPricingUrl } from '../src/services/tuzi-model-discovery';
import { defaultConfig, useConfigStore } from '../src/stores/use-config-store';
const endpoint = 'https://api.tu-zi.com';
afterEach(() => { delete (window as any).__TAURI_INTERNALS__; vi.restoreAllMocks(); });
function native(status: number, data: unknown) {
    const invoke = vi.fn().mockResolvedValue({ status, body: JSON.stringify(data), content_type: 'application/json' });
    (window as any).__TAURI_INTERNALS__ = { invoke };
    useConfigStore.setState({ config: { ...defaultConfig, proxyEnabled: false } });
    return invoke;
}
describe('packaged desktop model discovery', () => {
    it.each([endpoint, endpoint + '/v1', endpoint + '/v1/models/'])('gets models directly for %s without the web-only session proxy', async (baseUrl) => {
        const invoke = native(200, { data: [{ id: 'z' }, { id: 'gpt-image-2' }] });
        expect(await fetchImageModels({ baseUrl, apiKey: 'test-key', apiFormat: 'openai' })).toEqual(['gpt-image-2', 'z']);
        expect(invoke.mock.calls[0][1]).toMatchObject({ url: endpoint + '/v1/models', authorization: 'Bearer test-key' });
    });
    it('uses Gemini authentication and parses model names', async () => {
        const invoke = native(200, { models: [{ name: 'models/gemini-test' }] });
        expect(await fetchImageModels({ baseUrl: 'https://generativelanguage.googleapis.com', apiKey: 'gemini-key', apiFormat: 'gemini' })).toEqual(['gemini-test']);
        expect(invoke.mock.calls[0][1]).toMatchObject({ url: 'https://generativelanguage.googleapis.com/v1beta/models', authorization: null, googleApiKey: 'gemini-key' });
    });
    it.each([401, 403])('shows an actionable credential error for HTTP %s', async status => {
        native(status, { error: { message: 'Invalid token' } });
        await expect(fetchImageModels({ baseUrl: endpoint, apiKey: 'wrong', apiFormat: 'openai' })).rejects.toThrow('API Key 无效或无模型访问权限');
    });
    it('reads public pricing from the real API with no user credentials', async () => {
        const invoke = native(200, { success: true, data: [{ model_name: 'gpt-image-2', hot_rank: 1 }] });
        expect(tuziPricingUrl()).toBe(endpoint + '/api/pricing');
        expect(await fetchTuziModels('hot')).toEqual([{ name: 'gpt-image-2', capability: 'image' }]);
        expect(invoke.mock.calls[0][1]).toMatchObject({ url: endpoint + '/api/pricing', authorization: null, googleApiKey: null, timeoutMs: 20000 });
    });
    it('keeps the existing browser session proxy', async () => {
        const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { data: [{ id: 'test' }] } });
        expect(await fetchImageModels({ baseUrl: endpoint, apiKey: 'test', apiFormat: 'openai' })).toEqual(['test']);
        expect(get).toHaveBeenCalledWith('/__opentu_tuzi_session__/v1/models', expect.anything());
    });
});
