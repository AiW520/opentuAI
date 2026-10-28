import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../settings-manager', () => ({ geminiSettings: { update: vi.fn().mockResolvedValue(undefined) } }));
import { geminiSettings } from '../settings-manager';
import { promptForApiKey } from '../gemini-api/auth';
const input = () => document.querySelector<HTMLInputElement>('#apiKeyInput')!;
const confirm = () => document.querySelector<HTMLButtonElement>('#confirmBtn')!.click();
afterEach(async () => { document.querySelector<HTMLButtonElement>('#cancelBtn')?.click(); await Promise.resolve(); vi.clearAllMocks(); });
describe('API Key configuration dialog', () => {
  it('masks the key, deduplicates prompts and saves on Enter', async () => {
    const pending = promptForApiKey(); expect(promptForApiKey()).toBe(pending);
    expect(input().type).toBe('password'); expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    input().value = ' test-key ';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect(pending).resolves.toBe('test-key');
    expect(geminiSettings.update).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('saves a third-party key only into its own channel', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const pending = promptForApiKey({ contextId: 'provider-1', providerName: '<Third party>', onSave });
    expect(document.querySelector('h3')?.textContent).toContain('<Third party>');
    expect(document.querySelector('.api-key-dialog__guide')).toBeNull();
    input().value = 'channel-key'; confirm(); await expect(pending).resolves.toBe('channel-key');
    expect(onSave).toHaveBeenCalledWith('channel-key'); expect(geminiSettings.update).not.toHaveBeenCalled();
  });
  it('keeps failed saves editable and allows cancellation without changing configuration', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('write failed'));
    const pending = promptForApiKey({ contextId: 'provider-2', providerName: 'Test', onSave });
    input().value = 'test-key'; confirm();
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toContain('保存失败'));
    expect(input().value).toBe('test-key'); document.querySelector<HTMLButtonElement>('#cancelBtn')!.click();
    await expect(pending).resolves.toBeNull(); expect(geminiSettings.update).not.toHaveBeenCalled();
  });
});
