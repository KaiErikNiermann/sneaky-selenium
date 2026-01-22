// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.vendor/index.js
/// <reference path="./types.d.ts" />
((vendor) => {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'vendor', {
        get: () => vendor ?? 'Google Inc.',
    });
});
