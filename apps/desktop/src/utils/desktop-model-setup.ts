import { isTauriEnvironment } from './tauri-api';

/** Only the free canvas uses global credentials; workflow guides its own channels. */
export async function initializeDesktopModelSetup(): Promise<void> {
  if (!isTauriEnvironment() || window.location.pathname.startsWith('/workflow')) return;
  const { settingsManager, providerProfilesSettings } = await import('../../../../packages/drawnix/src/utils/settings-manager');
  await settingsManager.waitForInitialization();
  if (providerProfilesSettings.get().some(profile => profile.enabled && profile.apiKey.trim())) return;
  const { promptForApiKey } = await import('../../../../packages/drawnix/src/utils/gemini-api/auth');
  await promptForApiKey();
}
