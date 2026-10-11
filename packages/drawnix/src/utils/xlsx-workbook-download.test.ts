import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadXlsxWorkbook } from './xlsx-workbook-download';
import { setDesktopBinaryWriter } from './desktop-binary-writer';

vi.mock('../services/unified-cache-service', () => ({
  unifiedCacheService: { getCachedBlob: vi.fn() },
}));

describe('desktop workbook download', () => {
  const invoke = vi.fn();
  const write = vi.fn();
  let workbookBlob: Blob;
  const revoke = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('Blob', NodeBlob);
    (window as any).__TAURI_INTERNALS__ = { invoke };
    setDesktopBinaryWriter(write);
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob: Blob) {
        workbookBlob = blob;
        return 'blob:workbook';
      }
      static revokeObjectURL = revoke;
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => workbookBlob })));
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves the exact workbook through the desktop binary writer', async () => {
    invoke.mockResolvedValue('/downloads/batch.xlsx');
    const bytes = new Uint8Array([80, 75, 3, 4, 1]).buffer;
    await expect(downloadXlsxWorkbook(bytes, 'batch.xlsx')).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith('pick_save_location', { defaultName: 'batch.xlsx' });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toBe('/downloads/batch.xlsx');
    expect(new Uint8Array(await write.mock.calls[0][1].arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect(workbookBlob.type).toContain('spreadsheetml.sheet');
    expect(revoke).toHaveBeenCalledWith('blob:workbook');
  });

  it('reports cancellation without writing a file or announcing success', async () => {
    invoke.mockResolvedValue(null);
    await expect(downloadXlsxWorkbook(new ArrayBuffer(0), 'batch.xlsx')).resolves.toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:workbook');
  });
});
