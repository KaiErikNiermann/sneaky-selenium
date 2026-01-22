// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/_utils/index.js
/// <reference path="./types.d.ts" />
(() => {
    const utilsObj = {};
    /**
     * Wraps a JS Proxy Handler and strips its presence from error stacks,
     * in case the traps throw.
     *
     * The presence of a JS Proxy can be revealed as it shows up in error stack traces.
     */
    utilsObj.stripProxyFromErrors = (handler = {}) => {
        const newHandler = {};
        const traps = Object.getOwnPropertyNames(handler);
        traps.forEach((trap) => {
            const originalTrap = handler[trap];
            if (typeof originalTrap !== 'function')
                return;
            newHandler[trap] = function (...args) {
                try {
                    return originalTrap.apply(this, args);
                }
                catch (err) {
                    if (!(err instanceof Error) || !err.stack?.includes('at ')) {
                        throw err;
                    }
                    const stripWithBlacklist = (stack) => {
                        const blacklist = [
                            `at Reflect.${trap} `,
                            `at Object.${trap} `,
                            `at Object.newHandler.<computed> [as ${trap}] `,
                        ];
                        return stack
                            .split('\n')
                            .filter((line, index) => index !== 1)
                            .filter((line) => !blacklist.some((bl) => line.trim().startsWith(bl)))
                            .join('\n');
                    };
                    const stripWithAnchor = (stack) => {
                        const stackArr = stack.split('\n');
                        const anchor = `at Object.newHandler.<computed> [as ${trap}] `;
                        const anchorIndex = stackArr.findIndex((line) => line.trim().startsWith(anchor));
                        if (anchorIndex === -1) {
                            return false;
                        }
                        stackArr.splice(1, anchorIndex);
                        return stackArr.join('\n');
                    };
                    err.stack = stripWithAnchor(err.stack) || stripWithBlacklist(err.stack);
                    throw err;
                }
            };
        });
        return newHandler;
    };
    /**
     * Strip error lines from stack traces until (and including) a known line the stack.
     */
    utilsObj.stripErrorWithAnchor = (err, anchor) => {
        const stackArr = err.stack?.split('\n') ?? [];
        const anchorIndex = stackArr.findIndex((line) => line.trim().startsWith(anchor));
        if (anchorIndex === -1) {
            return err;
        }
        stackArr.splice(1, anchorIndex);
        err.stack = stackArr.join('\n');
        return err;
    };
    /**
     * Replace the property of an object in a stealthy way.
     */
    utilsObj.replaceProperty = (obj, propName, descriptorOverrides = {}) => {
        return Object.defineProperty(obj, propName, {
            ...(Object.getOwnPropertyDescriptor(obj, propName) ?? {}),
            ...descriptorOverrides,
        });
    };
    /**
     * Preload a cache of function copies and data.
     */
    utilsObj.preloadCache = () => {
        if (utilsObj.cache) {
            return;
        }
        utilsObj.cache = {
            Reflect: {
                get: Reflect.get.bind(Reflect),
                apply: Reflect.apply.bind(Reflect),
            },
            nativeToStringStr: Function.toString + '',
        };
    };
    /**
     * Utility function to generate a cross-browser `toString` result representing native code.
     */
    utilsObj.makeNativeString = (name = '') => {
        utilsObj.preloadCache?.();
        return utilsObj.cache.nativeToStringStr.replace('toString', name || '');
    };
    /**
     * Helper function to modify the `toString()` result of the provided object.
     */
    utilsObj.patchToString = (obj, str = '') => {
        utilsObj.preloadCache?.();
        const toStringProxy = new Proxy(Function.prototype.toString, {
            apply: function (target, ctx) {
                if (ctx === Function.prototype.toString) {
                    return utilsObj.makeNativeString('toString');
                }
                if (ctx === obj) {
                    return str || utilsObj.makeNativeString(obj.name ?? '');
                }
                const hasSameProto = Object.getPrototypeOf(Function.prototype.toString).isPrototypeOf(ctx.toString);
                if (!hasSameProto) {
                    return ctx.toString();
                }
                return target.call(ctx);
            },
        });
        utilsObj.replaceProperty?.(Function.prototype, 'toString', {
            value: toStringProxy,
        });
    };
    /**
     * Make all nested functions of an object native.
     */
    utilsObj.patchToStringNested = (obj = {}) => {
        return utilsObj.execRecursively(obj, ['function'], (item) => {
            if (typeof item === 'object' && item !== null) {
                utilsObj.patchToString(item);
            }
        });
    };
    /**
     * Redirect toString requests from one object to another.
     */
    utilsObj.redirectToString = (proxyObj, originalObj) => {
        utilsObj.preloadCache?.();
        const toStringProxy = new Proxy(Function.prototype.toString, {
            apply: function (target, ctx) {
                if (ctx === Function.prototype.toString) {
                    return utilsObj.makeNativeString('toString');
                }
                if (ctx === proxyObj) {
                    const fallback = () => originalObj.name
                        ? utilsObj.makeNativeString(originalObj.name)
                        : utilsObj.makeNativeString(proxyObj.name ?? '');
                    return originalObj + '' || fallback();
                }
                const hasSameProto = Object.getPrototypeOf(Function.prototype.toString).isPrototypeOf(ctx.toString);
                if (!hasSameProto) {
                    return ctx.toString();
                }
                return target.call(ctx);
            },
        });
        utilsObj.replaceProperty?.(Function.prototype, 'toString', {
            value: toStringProxy,
        });
    };
    /**
     * All-in-one method to replace a property with a JS Proxy using the provided Proxy handler with traps.
     */
    utilsObj.replaceWithProxy = (obj, propName, handler) => {
        utilsObj.preloadCache?.();
        const objRecord = obj;
        const originalObj = objRecord[propName];
        const proxyObj = new Proxy(originalObj, utilsObj.stripProxyFromErrors(handler));
        utilsObj.replaceProperty?.(obj, propName, { value: proxyObj });
        utilsObj.redirectToString?.(proxyObj, originalObj);
        return true;
    };
    /**
     * All-in-one method to mock a non-existing property with a JS Proxy.
     */
    utilsObj.mockWithProxy = (obj, propName, pseudoTarget, handler) => {
        utilsObj.preloadCache?.();
        const proxyObj = new Proxy(pseudoTarget, utilsObj.stripProxyFromErrors(handler));
        utilsObj.replaceProperty?.(obj, propName, { value: proxyObj });
        utilsObj.patchToString?.(proxyObj);
        return true;
    };
    /**
     * All-in-one method to create a new JS Proxy with stealth tweaks.
     */
    utilsObj.createProxy = (pseudoTarget, handler) => {
        utilsObj.preloadCache?.();
        const proxyObj = new Proxy(pseudoTarget, utilsObj.stripProxyFromErrors(handler));
        utilsObj.patchToString?.(proxyObj);
        return proxyObj;
    };
    /**
     * Helper function to split a full path to an Object into the first part and property.
     */
    utilsObj.splitObjPath = (objPath) => ({
        objName: objPath.split('.').slice(0, -1).join('.'),
        propName: objPath.split('.').slice(-1)[0] ?? '',
    });
    /**
     * Convenience method to replace a property with a JS Proxy using the provided objPath.
     */
    utilsObj.replaceObjPathWithProxy = (objPath, handler) => {
        const { objName, propName } = utilsObj.splitObjPath(objPath);
        // Using Function constructor instead of eval for slightly better practice
        const obj = new Function(`return ${objName}`)();
        return utilsObj.replaceWithProxy(obj, propName, handler);
    };
    /**
     * Traverse nested properties of an object recursively and apply the given function.
     */
    utilsObj.execRecursively = (obj = {}, typeFilter = [], fn) => {
        function recurse(currentObj) {
            for (const key in currentObj) {
                const value = currentObj[key];
                if (value === undefined) {
                    continue;
                }
                if (value && typeof value === 'object') {
                    recurse(value);
                }
                else {
                    if (value && typeFilter.includes(typeof value)) {
                        fn.call(null, value);
                    }
                }
            }
        }
        recurse(obj);
        return obj;
    };
    /**
     * Stringify functions in an object for serialization.
     */
    utilsObj.stringifyFns = (fnObj = {}) => {
        return Object.fromEntries(Object.entries(fnObj)
            .filter(([, value]) => typeof value === 'function')
            .map(([key, value]) => [key, value.toString()]));
    };
    /**
     * Materialize stringified functions back to real functions.
     */
    utilsObj.materializeFns = (fnStrObj = {}) => {
        return Object.fromEntries(Object.entries(fnStrObj).map(([key, value]) => {
            if (value.startsWith('function')) {
                return [key, new Function(`return ${value}`)()];
            }
            else {
                return [key, new Function(`return ${value}`)()];
            }
        }));
    };
    utilsObj.preloadCache();
    // Assign to global utils
    globalThis.utils = utilsObj;
})();
