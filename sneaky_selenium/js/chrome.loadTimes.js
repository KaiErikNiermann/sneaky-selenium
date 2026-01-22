// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js
/// <reference path="./types.d.ts" />
/**
 * Helper to get navigation timing data from Navigation Timing API Level 2.
 */
const getNavigationEntry = () => {
    const entries = performance.getEntriesByType('navigation');
    const entry = entries[0];
    if (entry) {
        return entry;
    }
    // Fallback for environments where navigation timing isn't available
    return {
        nextHopProtocol: 'h2',
        type: 'other',
        startTime: 0,
        responseStart: 0,
        domContentLoadedEventEnd: 0,
        loadEventEnd: 0,
    };
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
    if ('loadTimes' in window.chrome) {
        return;
    }
    // Check that the Navigation Timing API v2 and Paint Timing API are available
    if (!window.performance || !window.PerformancePaintTiming) {
        return;
    }
    const { performance } = window;
    const protocolInfo = {
        get connectionInfo() {
            const ntEntry = getNavigationEntry();
            return ntEntry.nextHopProtocol;
        },
        get npnNegotiatedProtocol() {
            const ntEntry = getNavigationEntry();
            return ['h2', 'hq'].includes(ntEntry.nextHopProtocol)
                ? ntEntry.nextHopProtocol
                : 'unknown';
        },
        get navigationType() {
            const ntEntry = getNavigationEntry();
            return ntEntry.type;
        },
        get wasAlternateProtocolAvailable() {
            return false;
        },
        get wasFetchedViaSpdy() {
            const ntEntry = getNavigationEntry();
            return ['h2', 'hq'].includes(ntEntry.nextHopProtocol);
        },
        get wasNpnNegotiated() {
            const ntEntry = getNavigationEntry();
            return ['h2', 'hq'].includes(ntEntry.nextHopProtocol);
        },
    };
    function toFixed(num, fixed) {
        const re = new RegExp('^-?\\d+(?:.\\d{0,' + (fixed || -1) + '})?');
        const match = num.toString().match(re);
        return match?.[0] ?? '0';
    }
    const timingInfo = {
        get firstPaintAfterLoadTime() {
            return 0;
        },
        get requestTime() {
            // Use performance.timeOrigin (Navigation Timing Level 2)
            return performance.timeOrigin / 1000;
        },
        get startLoadTime() {
            return performance.timeOrigin / 1000;
        },
        get commitLoadTime() {
            const ntEntry = getNavigationEntry();
            return (performance.timeOrigin + ntEntry.responseStart) / 1000;
        },
        get finishDocumentLoadTime() {
            const ntEntry = getNavigationEntry();
            return (performance.timeOrigin + ntEntry.domContentLoadedEventEnd) / 1000;
        },
        get finishLoadTime() {
            const ntEntry = getNavigationEntry();
            return (performance.timeOrigin + ntEntry.loadEventEnd) / 1000;
        },
        get firstPaintTime() {
            const fpEntry = performance.getEntriesByType('paint')[0];
            const ntEntry = getNavigationEntry();
            const fallbackTime = ntEntry.loadEventEnd;
            const startTime = fpEntry?.startTime ?? fallbackTime;
            return toFixed((startTime + performance.timeOrigin) / 1000, 3);
        },
    };
    window.chrome.loadTimes = function () {
        return {
            ...protocolInfo,
            ...timingInfo,
        };
    };
    utils.patchToString(window.chrome.loadTimes);
})();
