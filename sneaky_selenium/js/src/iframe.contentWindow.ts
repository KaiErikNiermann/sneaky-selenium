// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js
/// <reference path="./types.d.ts" />

/* eslint-disable @typescript-eslint/no-deprecated -- Proxying document.createElement which TypeScript incorrectly flags as deprecated */

interface ContentWindowProxy {
  get(target: Window, key: string | symbol): unknown;
}

(() => {
  try {
    const addContentWindowProxy = (iframe: HTMLIFrameElement): void => {
      const contentWindowProxy: ContentWindowProxy = {
        get(target: Window, key: string | symbol): unknown {
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
          get(): Window {
            return proxy;
          },
          set(newValue: Window): Window {
            return newValue;
          },
          enumerable: true,
          configurable: false,
        });
      }
    };

    const handleIframeCreation = (
      target: typeof document.createElement,
      thisArg: Document,
      args: [string, ElementCreationOptions?]
    ): HTMLIFrameElement => {
      const iframe = target.apply(thisArg, args) as HTMLIFrameElement;

      const _iframe = iframe;
      const _srcdoc = _iframe.srcdoc;

      Object.defineProperty(iframe, 'srcdoc', {
        configurable: true,
        get: function (): string {
          return _iframe.srcdoc;
        },
        set: function (newValue: string): void {
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

    const addIframeCreationSniffer = (): void => {
      const createElement: ProxyHandler<typeof document.createElement> = {
        get(target: typeof document.createElement, key: string | symbol): unknown {
          return Reflect.get(target, key);
        },
        apply: function (
          target: typeof document.createElement,
          thisArg: Document,
          args: [string, ElementCreationOptions?]
        ): HTMLElement {
          const tagName = args[0];
          const isIframe = tagName?.toLowerCase() === 'iframe';
          if (!isIframe) {
            return target.apply(thisArg, args);
          } else {
            return handleIframeCreation(target, thisArg, args);
          }
        },
      };

      document.createElement = new Proxy(document.createElement, createElement);
    };

    addIframeCreationSniffer();
  } catch {
    // Silent catch - iframe manipulation can fail in certain contexts
  }
})();
