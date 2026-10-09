/**
 * core/dashboard.ts — identifying and positioning Tab Out's own tab.
 *
 * Multiple dashboards may coexist across tabs and windows. These helpers
 * identify them for tab positioning and the global dashboard shortcut.
 */

import type { TabInfo, TabOutSettings } from '../types';

/**
 * Every URL that means "a Tab Out dashboard".
 *
 * Chrome reports an overridden new tab either as the extension page URL or,
 * depending on how it was opened, as `chrome://newtab/` — so both count.
 */
export function dashboardUrls(extensionId: string): string[] {
  return [
    `chrome-extension://${extensionId}/index.html`,
    `chrome-extension://${extensionId}/index.html#`,
    'chrome://newtab/',
  ];
}

/**
 * Returns the dashboard tab's id if it is open but no longer the last tab in
 * its window, or `null` when there is nothing to do.
 *
 * Prefer the active dashboard, otherwise the rightmost one. Picking the first
 * match would move an older dashboard past a newly opened dashboard.
 * With a target id, only that dashboard may move; never fall back to another.
 */
export function findDashboardTabNeedingMove(
  tabs: readonly TabInfo[],
  dashboardUrls: readonly string[],
  windowId?: number,
  targetTabId?: number,
): number | null {
  const matches = tabs
    .filter((tab) => (windowId === undefined || tab.windowId === windowId) && dashboardUrls.includes(tab.url))
    .sort((a, b) => b.index - a.index);
  const dashboard = targetTabId === undefined
    ? matches.find((tab) => tab.active) ?? matches[0]
    : matches.find((tab) => tab.id === targetTabId);
  if (!dashboard) return null;

  const sameWindow = tabs
    .filter((tab) => tab.windowId === dashboard.windowId)
    .sort((a, b) => a.index - b.index);
  const last = sameWindow[sameWindow.length - 1];

  return !last || last.id === dashboard.id ? null : dashboard.id;
}

/**
 * Finds the dashboard tab to jump to, if one is open anywhere.
 *
 * Returns the *active* one in preference to an arbitrary match, so a user with
 * the dashboard open in two windows lands where they last were rather than
 * wherever the tab list happens to start.
 */
export function findDashboardTab(
  tabs: readonly TabInfo[],
  dashboardUrls: readonly string[],
): TabInfo | null {
  const matches = tabs.filter((tab) => dashboardUrls.includes(tab.url));
  if (matches.length === 0) return null;
  return matches.find((tab) => tab.active) ?? matches[0]!;
}

/** Select other dashboards to close on startup when the user wants just one. */
export function selectOtherDashboardTabIds(
  tabs: readonly TabInfo[],
  urls: readonly string[],
  currentTabId: number,
  settings: Pick<TabOutSettings, 'allowMultipleDashboards'>,
): number[] {
  if (settings.allowMultipleDashboards || currentTabId === -1) return [];
  // A page that has already closed must not close the dashboard that replaced it.
  if (!tabs.some((tab) => tab.id === currentTabId && urls.includes(tab.url))) return [];
  return tabs.filter((tab) => tab.id !== currentTabId && urls.includes(tab.url)).map((tab) => tab.id);
}
