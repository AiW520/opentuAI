import { describe, expect, it } from 'vitest';
import { isNewerDesktopVersion, parseDesktopRelease } from './desktop-release';

const release = (tag = 'v1.2.15-preview.1') => ({ tag_name: tag, assets: [{
  name: 'Opentu-macos-aarch64.dmg', browser_download_url: `https://github.com/AiW520/opentuAI/releases/download/${tag}/Opentu-macos-aarch64.dmg`,
}] });

describe('desktop release metadata', () => {
  it('compares numeric package versions and avoids same-version preview loops', () => {
    expect(isNewerDesktopVersion('v1.2.15-preview.2', '1.2.14')).toBe(true);
    expect(isNewerDesktopVersion('v1.2.14-preview.2', '1.2.14')).toBe(false);
    expect(isNewerDesktopVersion('v1.2.9', '1.2.14')).toBe(false);
    expect(isNewerDesktopVersion('v1.10.0', '1.2.14')).toBe(true);
    expect(() => isNewerDesktopVersion('1.2.15bad', '1.2.14')).toThrow();
  });
  it('requires published installers from the release repository', () => {
    expect(parseDesktopRelease(release(), '1.2.14')).toMatchObject({ version: '1.2.15-preview.1' });
    expect(parseDesktopRelease(release('v1.2.14-preview.1'), '1.2.14')).toBeNull();
    expect(() => parseDesktopRelease({ ...release(), draft: true }, '1.2.14')).toThrow();
    expect(() => parseDesktopRelease({ ...release(), assets: [{ name: 'test.dmg', browser_download_url: 'https://example.com/test.dmg' }] }, '1.2.14')).toThrow();
    expect(() => parseDesktopRelease({ ...release(), assets: [] }, '1.2.14')).toThrow();
  });
});
