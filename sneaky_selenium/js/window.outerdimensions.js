// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js
/// <reference path="./types.d.ts" />
(() => {
    try {
        if (window.outerWidth && window.outerHeight) {
            return;
        }
        // Default window frame size - may vary by OS and window manager
        const WINDOW_FRAME_HEIGHT = 85;
        // Set outer dimensions based on inner dimensions
        Object.defineProperty(window, 'outerWidth', {
            get: () => window.innerWidth,
            configurable: true,
        });
        Object.defineProperty(window, 'outerHeight', {
            get: () => window.innerHeight + WINDOW_FRAME_HEIGHT,
            configurable: true,
        });
    }
    catch {
        // Silent catch - dimension manipulation can fail in certain contexts
    }
})();
