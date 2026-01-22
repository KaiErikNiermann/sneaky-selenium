// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js
/// <reference path="./types.d.ts" />
/**
 * @deprecated chrome.csi() was deprecated in Chrome 64 (2018) and removed in later versions.
 * This evasion is kept for compatibility with older detection scripts but is no longer
 * necessary for modern bot detection systems. Modern browsers don't expose this API.
 *
 * Consider using standard Performance APIs instead:
 * - performance.getEntriesByType('navigation')
 * - performance.timing (also deprecated, use PerformanceNavigationTiming)
 */
/**
 * Helper to get navigation timing data from Navigation Timing API Level 2.
 * Falls back gracefully if not available.
 */
const getNavigationTiming = () => {
    const entries = performance.getEntriesByType('navigation');
    return entries[0] ?? null;
};
(() => {
    if (!window.chrome) {
        Object.defineProperty(window, 'chrome', {
            writable: true,
            enumerable: true,
            configurable: false,
            value: {},
        });
    }
    if ('csi' in window.chrome) {
        return;
    }
    // Check that the Navigation Timing API v2 is available
    const navTiming = getNavigationTiming();
    if (!window.performance || !navTiming) {
        return;
    }
    window.chrome.csi = function () {
        const timing = getNavigationTiming();
        const startTime = timing?.startTime ?? performance.timeOrigin;
        const domContentLoaded = timing?.domContentLoadedEventEnd ?? 0;
        return {
            onloadT: domContentLoaded,
            startE: startTime,
            pageT: Date.now() - performance.timeOrigin,
            tran: 15,
        };
    };
    utils.patchToString(window.chrome.csi);
})();
