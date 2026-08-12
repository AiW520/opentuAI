import { describe, expect, it, vi } from 'vitest';
import {
  setDesktopBinaryWriter,
  writeDesktopBinaryFile,
} from './desktop-binary-writer';

describe('desktop-binary-writer', () => {
  it('passes a 10 MB payload through as one Uint8Array without JSON conversion', async () => {
    const payload = new Uint8Array(10 * 1024 * 1024);
    payload[0] = 17;
    payload[payload.length - 1] = 231;
    const writer = vi.fn(async () => undefined);

    setDesktopBinaryWriter(writer);
    await writeDesktopBinaryFile('/tmp/opentu-large-export.bin', payload);

    expect(writer).toHaveBeenCalledTimes(1);
    const [path, receivedPayload] = writer.mock.calls[0] ?? [];
    expect(path).toBe('/tmp/opentu-large-export.bin');
    expect(receivedPayload).toBe(payload);
    expect(receivedPayload).toBeInstanceOf(Uint8Array);
    expect((receivedPayload as Uint8Array).byteLength).toBe(10 * 1024 * 1024);
  });
});
