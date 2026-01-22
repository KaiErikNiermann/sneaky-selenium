// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/_utils/index.js
/// <reference path="./types.d.ts" />

/**
 * A set of shared utility functions specifically for the purpose of modifying
 * native browser APIs without leaving traces.
 *
 * Meant to be passed down in puppeteer and used in the context of the page
 * (everything in here runs in NodeJS as well as a browser).
 */

type TrapName = keyof ProxyHandler<object>;

interface CacheType {
  Reflect: {
    get: typeof Reflect.get;
    apply: typeof Reflect.apply;
  };
  nativeToStringStr: string;
}

(() => {
  const utilsObj: Partial<StealthUtils> & { cache?: CacheType } = {};

  /**
   * Wraps a JS Proxy Handler and strips its presence from error stacks,
   * in case the traps throw.
   *
   * The presence of a JS Proxy can be revealed as it shows up in error stack traces.
   */
  utilsObj.stripProxyFromErrors = <T extends object>(
    handler: ProxyHandler<T> = {}
  ): ProxyHandler<T> => {
    const newHandler: ProxyHandler<T> = {};
    const traps = Object.getOwnPropertyNames(handler) as TrapName[];

    traps.forEach((trap) => {
      const originalTrap = handler[trap];
      if (typeof originalTrap !== 'function') return;

      (newHandler as Record<TrapName, unknown>)[trap] = function (
        this: unknown,
        ...args: unknown[]
      ): unknown {
        try {
          return (originalTrap as (...args: unknown[]) => unknown).apply(this, args);
        } catch (err) {
          if (!(err instanceof Error) || !err.stack?.includes('at ')) {
            throw err;
          }

          const stripWithBlacklist = (stack: string): string => {
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

          const stripWithAnchor = (stack: string): string | false => {
            const stackArr = stack.split('\n');
            const anchor = `at Object.newHandler.<computed> [as ${trap}] `;
            const anchorIndex = stackArr.findIndex((line) =>
              line.trim().startsWith(anchor)
            );
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
  utilsObj.stripErrorWithAnchor = (err: Error, anchor: string): Error => {
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
  utilsObj.replaceProperty = (
    obj: object,
    propName: string,
    descriptorOverrides: PropertyDescriptor = {}
  ): object => {
    return Object.defineProperty(obj, propName, {
      ...(Object.getOwnPropertyDescriptor(obj, propName) ?? {}),
      ...descriptorOverrides,
    });
  };

  /**
   * Preload a cache of function copies and data.
   */
  utilsObj.preloadCache = (): void => {
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
  utilsObj.makeNativeString = (name = ''): string => {
    utilsObj.preloadCache?.();
    return utilsObj.cache!.nativeToStringStr.replace('toString', name || '');
  };

  /**
   * Helper function to modify the `toString()` result of the provided object.
   */
  utilsObj.patchToString = (obj: object, str = ''): void => {
    utilsObj.preloadCache?.();

    const toStringProxy = new Proxy(Function.prototype.toString, {
      apply: function (target: typeof Function.prototype.toString, ctx: unknown): string {
        if (ctx === Function.prototype.toString) {
          return utilsObj.makeNativeString!('toString');
        }
        if (ctx === obj) {
          return str || utilsObj.makeNativeString!((obj as { name?: string }).name ?? '');
        }
        const hasSameProto = Object.getPrototypeOf(Function.prototype.toString).isPrototypeOf(
          (ctx as { toString: () => string }).toString
        );
        if (!hasSameProto) {
          return (ctx as { toString: () => string }).toString();
        }
        return target.call(ctx as () => string);
      },
    });

    utilsObj.replaceProperty?.(Function.prototype, 'toString', {
      value: toStringProxy,
    });
  };

  /**
   * Make all nested functions of an object native.
   */
  utilsObj.patchToStringNested = (obj: object = {}): object => {
    return utilsObj.execRecursively!(obj, ['function'], (item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        utilsObj.patchToString!(item);
      }
    });
  };

  /**
   * Redirect toString requests from one object to another.
   */
  utilsObj.redirectToString = (proxyObj: object, originalObj: object): void => {
    utilsObj.preloadCache?.();

    const toStringProxy = new Proxy(Function.prototype.toString, {
      apply: function (target: typeof Function.prototype.toString, ctx: unknown): string {
        if (ctx === Function.prototype.toString) {
          return utilsObj.makeNativeString!('toString');
        }

        if (ctx === proxyObj) {
          const fallback = (): string =>
            (originalObj as { name?: string }).name
              ? utilsObj.makeNativeString!((originalObj as { name: string }).name)
              : utilsObj.makeNativeString!((proxyObj as { name?: string }).name ?? '');

          return originalObj + '' || fallback();
        }

        const hasSameProto = Object.getPrototypeOf(Function.prototype.toString).isPrototypeOf(
          (ctx as { toString: () => string }).toString
        );
        if (!hasSameProto) {
          return (ctx as { toString: () => string }).toString();
        }

        return target.call(ctx as () => string);
      },
    });

    utilsObj.replaceProperty?.(Function.prototype, 'toString', {
      value: toStringProxy,
    });
  };

  /**
   * All-in-one method to replace a property with a JS Proxy using the provided Proxy handler with traps.
   */
  utilsObj.replaceWithProxy = <T extends object>(
    obj: object,
    propName: string,
    handler: ProxyHandler<T>
  ): boolean => {
    utilsObj.preloadCache?.();
    const objRecord = obj as Record<string, unknown>;
    const originalObj = objRecord[propName] as T;
    const proxyObj = new Proxy(originalObj, utilsObj.stripProxyFromErrors!(handler));

    utilsObj.replaceProperty?.(obj, propName, { value: proxyObj });
    utilsObj.redirectToString?.(proxyObj, originalObj as object);

    return true;
  };

  /**
   * All-in-one method to mock a non-existing property with a JS Proxy.
   */
  utilsObj.mockWithProxy = <T extends object>(
    obj: object,
    propName: string,
    pseudoTarget: T,
    handler: ProxyHandler<T>
  ): boolean => {
    utilsObj.preloadCache?.();
    const proxyObj = new Proxy(pseudoTarget, utilsObj.stripProxyFromErrors!(handler));

    utilsObj.replaceProperty?.(obj, propName, { value: proxyObj });
    utilsObj.patchToString?.(proxyObj);

    return true;
  };

  /**
   * All-in-one method to create a new JS Proxy with stealth tweaks.
   */
  utilsObj.createProxy = <T extends object>(pseudoTarget: T, handler: ProxyHandler<T>): T => {
    utilsObj.preloadCache?.();
    const proxyObj = new Proxy(pseudoTarget, utilsObj.stripProxyFromErrors!(handler));
    utilsObj.patchToString?.(proxyObj);

    return proxyObj;
  };

  /**
   * Helper function to split a full path to an Object into the first part and property.
   */
  utilsObj.splitObjPath = (objPath: string): { objName: string; propName: string } => ({
    objName: objPath.split('.').slice(0, -1).join('.'),
    propName: objPath.split('.').slice(-1)[0] ?? '',
  });

  /**
   * Convenience method to replace a property with a JS Proxy using the provided objPath.
   */
  utilsObj.replaceObjPathWithProxy = <T extends object>(
    objPath: string,
    handler: ProxyHandler<T>
  ): boolean => {
    const { objName, propName } = utilsObj.splitObjPath!(objPath);
    // Using Function constructor instead of eval for slightly better practice
    const obj = new Function(`return ${objName}`)() as Record<string, unknown>;
    return utilsObj.replaceWithProxy!(obj, propName, handler);
  };

  /**
   * Traverse nested properties of an object recursively and apply the given function.
   */
  utilsObj.execRecursively = (
    obj: object = {},
    typeFilter: string[] = [],
    fn: (item: unknown) => void
  ): object => {
    function recurse(currentObj: Record<string, unknown>): void {
      for (const key in currentObj) {
        const value = currentObj[key];
        if (value === undefined) {
          continue;
        }
        if (value && typeof value === 'object') {
          recurse(value as Record<string, unknown>);
        } else {
          if (value && typeFilter.includes(typeof value)) {
            fn.call(null, value);
          }
        }
      }
    }
    recurse(obj as Record<string, unknown>);
    return obj;
  };

  /**
   * Stringify functions in an object for serialization.
   */
  utilsObj.stringifyFns = (
    fnObj: Record<string, (...args: unknown[]) => unknown> = {}
  ): Record<string, string> => {
    return Object.fromEntries(
      Object.entries(fnObj)
        .filter(([, value]) => typeof value === 'function')
        .map(([key, value]) => [key, value.toString()])
    );
  };

  /**
   * Materialize stringified functions back to real functions.
   */
  utilsObj.materializeFns = (
    fnStrObj: Record<string, string> = {}
  ): Record<string, (...args: unknown[]) => unknown> => {
    return Object.fromEntries(
      Object.entries(fnStrObj).map(([key, value]) => {
        if (value.startsWith('function')) {
          return [key, new Function(`return ${value}`)() as (...args: unknown[]) => unknown];
        } else {
          return [key, new Function(`return ${value}`)() as (...args: unknown[]) => unknown];
        }
      })
    );
  };

  utilsObj.preloadCache();

  // Assign to global utils
  (globalThis as unknown as { utils: StealthUtils }).utils = utilsObj as StealthUtils;
})();
