// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js
/// <reference path="./types.d.ts" />
(() => {
    const handler = {
        apply: function (_target, _ctx, args) {
            const param = args[0];
            if (param?.name === 'notifications') {
                const result = { state: Notification.permission };
                Object.setPrototypeOf(result, PermissionStatus.prototype);
                return Promise.resolve(result);
            }
            return utils.cache.Reflect.apply(_target, _ctx, args);
        },
    };
    utils.replaceWithProxy(Object.getPrototypeOf(window.navigator.permissions), 'query', handler);
})();
