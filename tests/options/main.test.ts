// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { createChromeStore, createMemoryStore } from '@/platform/storage';
import { createDefaultSettings } from '@/config/defaults';
import { SETTINGS_KEY, SettingsStore } from '@/config/store';

vi.mock('@/platform/storage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/platform/storage')>(),
  createChromeStore: vi.fn(),
}));

it('loads, edits, reverts and saves the dashboard checkbox through the actual options page', async () => {
  const sync = createMemoryStore({
    [SETTINGS_KEY]: { ...createDefaultSettings(), allowMultipleDashboards: false },
  });
  const local = createMemoryStore();
  vi.mocked(createChromeStore).mockImplementation((area) => area === 'sync' ? sync : local);
  const html = readFileSync('src/options/options.html', 'utf8');
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;

  await import('@/options/main');
  const checkbox = document.getElementById('allowMultipleDashboards') as HTMLInputElement;
  const save = document.getElementById('saveBtn') as HTMLButtonElement;
  const revert = document.getElementById('revertBtn') as HTMLButtonElement;
  await vi.waitFor(() => expect(checkbox.checked).toBe(false));

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('input', { bubbles: true }));
  expect(save.disabled).toBe(false);
  expect((await new SettingsStore(sync).load()).allowMultipleDashboards).toBe(false);
  revert.click();
  await vi.waitFor(() => expect(checkbox.checked).toBe(false));
  expect(save.disabled).toBe(true);

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('input', { bubbles: true }));
  save.click();
  await vi.waitFor(() => expect(document.getElementById('saveStatus')?.textContent).toBe('Saved'));
  expect((await new SettingsStore(sync).load()).allowMultipleDashboards).toBe(true);
  expect(save.disabled).toBe(true);
});
