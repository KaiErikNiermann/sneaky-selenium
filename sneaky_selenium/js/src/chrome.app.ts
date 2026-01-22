// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js
/// <reference path="./types.d.ts" />

type RunningStateValue = 'cannot_run' | 'ready_to_run' | 'running';

interface StaticAppData {
  isInstalled: boolean;
  InstallState: {
    readonly DISABLED: 'disabled';
    readonly INSTALLED: 'installed';
    readonly NOT_INSTALLED: 'not_installed';
  };
  RunningState: {
    readonly CANNOT_RUN: 'cannot_run';
    readonly READY_TO_RUN: 'ready_to_run';
    readonly RUNNING: 'running';
  };
}

(() => {
  if (!window.chrome) {
    Object.defineProperty(window, 'chrome', {
      writable: true,
      enumerable: true,
      configurable: false,
      value: {},
    });
  }

  if ('app' in window.chrome!) {
    return;
  }

  const makeError = {
    ErrorInInvocation: (fn: string): TypeError => {
      const err = new TypeError(`Error in invocation of app.${fn}()`);
      return utils.stripErrorWithAnchor(err, `at ${fn} (eval at <anonymous>`) as TypeError;
    },
  };

  const STATIC_DATA: StaticAppData = {
    isInstalled: false,
    InstallState: {
      DISABLED: 'disabled',
      INSTALLED: 'installed',
      NOT_INSTALLED: 'not_installed',
    },
    RunningState: {
      CANNOT_RUN: 'cannot_run',
      READY_TO_RUN: 'ready_to_run',
      RUNNING: 'running',
    },
  };

  window.chrome!.app = {
    ...STATIC_DATA,

    get isInstalled(): boolean {
      return false;
    },

    getDetails: function getDetails(...args: unknown[]): null {
      if (args.length) {
        throw makeError.ErrorInInvocation('getDetails');
      }
      return null;
    },

    getIsInstalled: function getIsInstalled(...args: unknown[]): boolean {
      if (args.length) {
        throw makeError.ErrorInInvocation('getIsInstalled');
      }
      return false;
    },

    runningState: function runningState(...args: unknown[]): RunningStateValue {
      if (args.length) {
        throw makeError.ErrorInInvocation('runningState');
      }
      return 'cannot_run';
    },
  };

  utils.patchToStringNested(window.chrome!.app);
})();
