// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js
/// <reference path="./types.d.ts" />
/**
 * navigator.webdriver is the PRIMARY detection vector for Selenium/Playwright/Puppeteer.
 * When a browser is controlled by automation, this property returns true.
 *
 * This is still the most critical evasion as of 2026.
 *
 * We use multiple techniques:
 * 1. Object.defineProperty to override the getter
 * 2. Delete from prototype as fallback
 * 3. Ensure the property passes Object.getOwnPropertyDescriptor checks
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/webdriver
 */
(() => {
    // Method 1: Define property on prototype to return false
    // This is more robust than deletion as some detection scripts
    // check for the property's existence
    const proto = Object.getPrototypeOf(navigator);
    if ('webdriver' in navigator) {
        Object.defineProperty(proto, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true,
        });
    }
    // Method 2: Also try deletion as a fallback for older detection scripts
    try {
        delete proto.webdriver;
        // Re-define after deletion to ensure consistent false value
        Object.defineProperty(proto, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true,
        });
    }
    catch {
        // Deletion may fail in some contexts, that's okay
    }
    // Method 3: Handle edge case where webdriver is on navigator directly
    try {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true,
        });
    }
    catch {
        // May already be defined on prototype
    }
})();
