/**
 * Global type declarations for stealthenium browser evasion scripts.
 * These types extend the browser's built-in types for stealth operations.
 */

declare global {
  interface Window {
    chrome?: ChromeAPI;
    PerformancePaintTiming?: typeof PerformancePaintTiming;
  }

  interface ChromeAPI {
    app?: ChromeApp;
    csi?: () => ChromeCsiData;
    loadTimes?: () => ChromeLoadTimesData;
    runtime?: ChromeRuntime;
  }

  interface ChromeApp {
    isInstalled: boolean;
    InstallState: ChromeInstallState;
    RunningState: ChromeRunningState;
    getDetails: () => null;
    getIsInstalled: () => boolean;
    runningState: () => 'cannot_run' | 'ready_to_run' | 'running';
  }

  interface ChromeInstallState {
    readonly DISABLED: 'disabled';
    readonly INSTALLED: 'installed';
    readonly NOT_INSTALLED: 'not_installed';
  }

  interface ChromeRunningState {
    readonly CANNOT_RUN: 'cannot_run';
    readonly READY_TO_RUN: 'ready_to_run';
    readonly RUNNING: 'running';
  }

  interface ChromeCsiData {
    onloadT: number;
    startE: number;
    pageT: number;
    tran: number;
  }

  interface ChromeLoadTimesData {
    connectionInfo: string;
    npnNegotiatedProtocol: string;
    navigationType: string;
    wasAlternateProtocolAvailable: boolean;
    wasFetchedViaSpdy: boolean;
    wasNpnNegotiated: boolean;
    firstPaintAfterLoadTime: number;
    requestTime: number;
    startLoadTime: number;
    commitLoadTime: number;
    finishDocumentLoadTime: number;
    finishLoadTime: number;
    firstPaintTime: string;
  }

  interface ChromeRuntime {
    id?: undefined;
    connect: ((extensionId?: string, connectInfo?: ConnectInfo) => Port) | null;
    sendMessage: ((extensionId: string, message?: unknown, options?: object, responseCallback?: () => void) => undefined) | null;
    OnInstalledReason: Record<string, string>;
    OnRestartRequiredReason: Record<string, string>;
    PlatformArch: Record<string, string>;
    PlatformNaclArch: Record<string, string>;
    PlatformOs: Record<string, string>;
    RequestUpdateCheckStatus: Record<string, string>;
  }

  interface ConnectInfo {
    name?: string;
    includeTlsChannelId?: boolean;
  }

  interface Port {
    name: string;
    sender: undefined;
    disconnect: () => void;
    onDisconnect: PortEvent;
    onMessage: PortEvent;
    postMessage: (message: unknown) => void;
  }

  interface PortEvent {
    addListener: () => void;
    dispatch: () => void;
    hasListener: () => void;
    hasListeners: () => boolean;
    removeListener: () => void;
  }

  // Utils global reference
  let utils: StealthUtils;

  interface StealthUtils {
    cache: UtilsCache;
    stripProxyFromErrors: <T extends object>(handler: ProxyHandler<T>) => ProxyHandler<T>;
    stripErrorWithAnchor: (err: Error, anchor: string) => Error;
    replaceProperty: (obj: object, propName: string, descriptorOverrides?: PropertyDescriptor) => object;
    preloadCache: () => void;
    makeNativeString: (name?: string) => string;
    patchToString: (obj: object, str?: string) => void;
    patchToStringNested: (obj?: object) => object;
    redirectToString: (proxyObj: object, originalObj: object) => void;
    replaceWithProxy: <T extends object>(obj: object, propName: string, handler: ProxyHandler<T>) => boolean;
    mockWithProxy: <T extends object>(obj: object, propName: string, pseudoTarget: T, handler: ProxyHandler<T>) => boolean;
    createProxy: <T extends object>(pseudoTarget: T, handler: ProxyHandler<T>) => T;
    splitObjPath: (objPath: string) => { objName: string; propName: string };
    replaceObjPathWithProxy: <T extends object>(objPath: string, handler: ProxyHandler<T>) => boolean;
    execRecursively: (obj: object, typeFilter: string[], fn: (item: unknown) => void) => object;
    stringifyFns: (fnObj: Record<string, (...args: unknown[]) => unknown>) => Record<string, string>;
    materializeFns: (fnStrObj: Record<string, string>) => Record<string, (...args: unknown[]) => unknown>;
  }

  interface UtilsCache {
    Reflect: {
      get: typeof Reflect.get;
      apply: typeof Reflect.apply;
    };
    nativeToStringStr: string;
  }

  // Plugin/MimeType array types
  interface PluginData {
    name: string;
    filename: string;
    description: string;
    __mimeTypes: string[];
  }

  interface MimeTypeData {
    type: string;
    suffixes: string;
    description: string;
    __pluginName: string;
  }

  interface PluginsAndMimeTypesData {
    mimeTypes: MimeTypeData[];
    plugins: PluginData[];
  }
}

export type {
  ChromeAPI,
  ChromeApp,
  ChromeRuntime,
  ChromeCsiData,
  ChromeLoadTimesData,
  StealthUtils,
  PluginData,
  MimeTypeData,
  PluginsAndMimeTypesData,
};
