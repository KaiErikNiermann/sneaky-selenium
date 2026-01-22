// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js
/// <reference path="./types.d.ts" />
(() => {
    try {
        const addContentWindowProxy = (iframe) => {
            const contentWindowProxy = {
                get(target, key) {
                    if (key === 'self') {
                        return contentWindowProxy;
                    }
                    if (key === 'frameElement') {
                        return iframe;
                    }
                    return Reflect.get(target, key);
                },
            };
            if (!iframe.contentWindow) {
                const proxy = new Proxy(window, contentWindowProxy);
                Object.defineProperty(iframe, 'contentWindow', {
                    get() {
                        return proxy;
                    },
                    set(newValue) {
                        return newValue;
                    },
                    enumerable: true,
                    configurable: false,
                });
            }
        };
        const handleIframeCreation = (target, thisArg, args) => {
            const iframe = target.apply(thisArg, args);
            const _iframe = iframe;
            const _srcdoc = _iframe.srcdoc;
            Object.defineProperty(iframe, 'srcdoc', {
                configurable: true,
                get: function () {
                    return _iframe.srcdoc;
                },
                set: function (newValue) {
                    addContentWindowProxy(this);
                    Object.defineProperty(iframe, 'srcdoc', {
                        configurable: false,
                        writable: false,
                        value: _srcdoc,
                    });
                    _iframe.srcdoc = newValue;
                },
            });
            return iframe;
        };
        const addIframeCreationSniffer = () => {
            const createElement = {
                get(target, key) {
                    return Reflect.get(target, key);
                },
                apply: function (target, thisArg, args) {
                    const tagName = args[0];
                    const isIframe = tagName?.toLowerCase() === 'iframe';
                    if (!isIframe) {
                        return target.apply(thisArg, args);
                    }
                    else {
                        return handleIframeCreation(target, thisArg, args);
                    }
                },
            };
            document.createElement = new Proxy(document.createElement, createElement);
        };
        addIframeCreationSniffer();
    }
    catch {
        // Silent catch - iframe manipulation can fail in certain contexts
    }
})();
