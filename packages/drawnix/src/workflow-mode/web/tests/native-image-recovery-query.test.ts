import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { queryWorkflowImageResult } from '../src/services/api/image-recovery';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../../services/provider-routing/tuzi-api-endpoints', async importOriginal => ({
    ...await importOriginal<typeof import('../../../services/provider-routing/tuzi-api-endpoints')>(),
    loadTuziApiEndpointBaseUrls: vi.fn(async () => ['https://api.tu-zi.com', 'https://bus.tu-zi.com', 'https://untrusted.example']),
}));
beforeEach(() => vi.clearAllMocks());
afterEach(() => { delete (window as any).__TAURI_INTERNALS__; });

describe('workflow image recovery uses the canvas query contract', () => {
    it('uses the native transport in desktop mode and preserves the request identity', async () => {
        const invoke = vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: 'succeeded', request_id: 'attempt', data: [{ url: 'https://example.test/result.png' }] }) });
        (window as any).__TAURI_INTERNALS__ = { invoke };
        expect(await queryWorkflowImageResult('https://api.tu-zi.com/v1', 'fictional-key', 'attempt')).toMatchObject({ status: 'succeeded' });
        expect(invoke).toHaveBeenCalledWith('query_image_recovery', { url: 'https://api.tu-zi.com/log/get-request?id=attempt', authorization: 'Bearer fictional-key' });
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('does not retry another node after native authentication fails', async () => {
        const invoke = vi.fn().mockResolvedValue({ status: 401, body: '{}' });
        (window as any).__TAURI_INTERNALS__ = { invoke };
        await expect(queryWorkflowImageResult('https://api.tu-zi.com', 'fictional-key', 'attempt')).rejects.toMatchObject({ response: { status: 401 } });
        expect(invoke).toHaveBeenCalledTimes(1);
    });
    it('queries a trusted fallback after the original transport fails, keeping request id and credential', async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: { status: 'succeeded', data: [{ url: 'https://example.test/result.png' }] } });
        expect(await queryWorkflowImageResult('https://api.tu-zi.com', 'fictional-key', 'attempt')).toMatchObject({ status: 'succeeded' });
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith('https://bus.tu-zi.com/log/get-request?id=attempt', expect.objectContaining({ headers: { authorization: 'Bearer fictional-key' } }));
    });
    it.each([401, 403, 400])('preserves HTTP %s query errors without retrying another node', async status => {
        const error = Object.assign(new Error('denied'), { response: { status } });
        vi.mocked(axios.get).mockRejectedValueOnce(error);
        await expect(queryWorkflowImageResult('https://api.tu-zi.com', 'fictional-key', 'attempt')).rejects.toBe(error);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });
    it.each(['processing_or_not_found', 'failed'])('does not fail over a valid %s response', async status => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { status } });
        expect(await queryWorkflowImageResult('https://api.tu-zi.com', 'fictional-key', 'attempt')).toEqual({ status });
        expect(axios.get).toHaveBeenCalledTimes(1);
    });
    it('does not apply a result belonging to another request', async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { status: 'succeeded', request_id: 'other', data: [{ url: 'https://example.test/other.png' }] } });
        expect(await queryWorkflowImageResult('https://api.tu-zi.com/v1', 'fictional-key', 'attempt')).toEqual({ status: 'processing_or_not_found' });
        expect(axios.get).toHaveBeenCalledTimes(1);
    });
    it('never sends credentials to an untrusted fallback', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
        await expect(queryWorkflowImageResult('https://api.tu-zi.com', 'fictional-key', 'attempt')).rejects.toThrow('offline');
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(vi.mocked(axios.get).mock.calls.every(([url]) => !url.includes('untrusted'))).toBe(true);
    });
});
