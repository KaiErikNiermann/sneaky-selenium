// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js
/// <reference path="./types.d.ts" />
// WebGL parameter constants
const UNMASKED_VENDOR_WEBGL = 37445;
const UNMASKED_RENDERER_WEBGL = 37446;
((vendor, renderer) => {
    const getParameterProxyHandler = {
        apply: function (target, ctx, args) {
            const param = args[0];
            if (param === UNMASKED_VENDOR_WEBGL) {
                return vendor ?? 'Intel Inc.';
            }
            if (param === UNMASKED_RENDERER_WEBGL) {
                return renderer ?? 'Intel Iris OpenGL Engine';
            }
            return utils.cache.Reflect.apply(target, ctx, args);
        },
    };
    const addProxy = (obj, propName) => {
        utils.replaceWithProxy(obj, propName, getParameterProxyHandler);
    };
    addProxy(WebGLRenderingContext.prototype, 'getParameter');
    addProxy(WebGL2RenderingContext.prototype, 'getParameter');
});
