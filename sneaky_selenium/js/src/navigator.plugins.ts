// https://github.com/berstend/puppeteer-extra/tree/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.plugins
/// <reference path="./types.d.ts" />

/**
 * Navigator plugins evasion for modern browsers (Chrome 93+, Firefox 98+).
 * 
 * IMPORTANT: Since 2021, navigator.plugins returns hard-coded values in modern browsers:
 * - Only PDF-related plugins are returned (for inline PDF viewing detection)
 * - Real plugin enumeration was removed for privacy reasons
 * 
 * This evasion now uses the standardized "five standard plugins" that modern
 * browsers return when inline PDF viewing is supported.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/plugins
 * @see https://chromestatus.com/feature/5741884322349056
 */

/* eslint-disable @typescript-eslint/no-deprecated -- Intentionally mocking deprecated browser Plugin/MimeType APIs for stealth purposes */

interface MimeTypeDataInternal {
  type: string;
  suffixes: string;
  description: string;
  __pluginName: string;
}

interface PluginDataInternal {
  name: string;
  filename: string;
  description: string;
  __mimeTypes: string[];
  [index: number]: MimeType;
}

interface FunctionMocks {
  item: (index: number) => Plugin | MimeType | null;
  namedItem: (name: string) => Plugin | MimeType | null;
  refresh?: () => void;
}

interface PluginsFns {
  generatePluginArray: (
    utils: StealthUtils,
    fns: PluginsFns
  ) => (pluginsData: PluginDataInternal[]) => PluginArray;
  generateMimeTypeArray: (
    utils: StealthUtils,
    fns: PluginsFns
  ) => (mimeTypesData: MimeTypeDataInternal[]) => MimeTypeArray;
  generateFunctionMocks: (
    utils: StealthUtils
  ) => (
    proto: PluginArray | MimeTypeArray,
    itemMainProp: string,
    dataArray: (Plugin | MimeType)[]
  ) => FunctionMocks;
  generateMagicArray: (
    utils: StealthUtils,
    fns: PluginsFns
  ) => <T extends Plugin | MimeType>(
    dataArray: object[],
    proto: object,
    itemProto: object,
    itemMainProp: string
  ) => T[];
}

(() => {
  const fns: PluginsFns = {} as PluginsFns;

  fns.generatePluginArray = (utils: StealthUtils, fns: PluginsFns) => (
    pluginsData: PluginDataInternal[]
  ): PluginArray => {
    return fns.generateMagicArray(utils, fns)(
      pluginsData,
      PluginArray.prototype,
      Plugin.prototype,
      'name'
    ) as unknown as PluginArray;
  };

  fns.generateFunctionMocks = (utils: StealthUtils) => (
    proto: PluginArray | MimeTypeArray,
    itemMainProp: string,
    dataArray: (Plugin | MimeType)[]
  ): FunctionMocks => ({
    item: utils.createProxy((proto as PluginArray).item ?? ((_index: number) => null), {
      apply(
        _target: (index: number) => Plugin | MimeType | null,
        _ctx: unknown,
        args: unknown[]
      ): Plugin | MimeType | null {
        if (!args.length) {
          throw new TypeError(
            `Failed to execute 'item' on '${
              (proto as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] ?? 'Array'
            }': 1 argument required, but only 0 present.`
          );
        }
        const isInteger = args[0] !== null && Number.isInteger(Number(args[0]));
        return (isInteger ? dataArray[Number(args[0])] : dataArray[0]) ?? null;
      },
    }),

    namedItem: utils.createProxy(
      (proto as PluginArray).namedItem ?? ((_name: string) => null),
      {
        apply(
          _target: (name: string) => Plugin | MimeType | null,
          _ctx: unknown,
          args: unknown[]
        ): Plugin | MimeType | null {
          if (!args.length) {
            throw new TypeError(
              `Failed to execute 'namedItem' on '${
                (proto as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] ?? 'Array'
              }': 1 argument required, but only 0 present.`
            );
          }
          return (
            dataArray.find(
              (mt) => (mt as unknown as Record<string, unknown>)[itemMainProp] === args[0]
            ) ?? null
          );
        },
      }
    ),

    refresh: (proto as PluginArray).refresh
      ? utils.createProxy((proto as PluginArray).refresh!, {
          apply(): undefined {
            return undefined;
          },
        })
      : undefined,
  });

  fns.generateMagicArray = (utils: StealthUtils, fns: PluginsFns) =>
    function <T extends Plugin | MimeType>(
      dataArray: object[] = [],
      proto: object = MimeTypeArray.prototype,
      itemProto: object = MimeType.prototype,
      itemMainProp = 'type'
    ): T[] {
      const defineProp = (obj: object, prop: string | number, value: unknown): void => {
        Object.defineProperty(obj, prop, {
          value,
          writable: false,
          enumerable: false,
          configurable: false,
        });
      };

      const makeItem = (data: Record<string, unknown>): T => {
        const item: Record<string, unknown> = {};
        for (const prop of Object.keys(data)) {
          if (prop.startsWith('__')) {
            continue;
          }
          defineProp(item, prop, data[prop]);
        }
        return Object.create(itemProto, Object.getOwnPropertyDescriptors(item)) as T;
      };

      const magicArray: T[] = [];

      dataArray.forEach((data) => {
        magicArray.push(makeItem(data as Record<string, unknown>));
      });

      magicArray.forEach((entry) => {
        const key = (entry as unknown as Record<string, string>)[itemMainProp];
        if (key) {
          defineProp(magicArray, key, entry);
        }
      });

      const descriptors: PropertyDescriptorMap = {
        length: {
          value: magicArray.length,
          writable: false,
          enumerable: false,
          configurable: true,
        },
      };

      // Copy array property descriptors
      const arrayDescriptors = Object.getOwnPropertyDescriptors(magicArray);
      for (const key of Object.keys(arrayDescriptors)) {
        const desc = arrayDescriptors[key];
        if (desc) {
          descriptors[key] = desc;
        }
      }

      const magicArrayObj = Object.create(proto, descriptors) as T[] & { [key: string]: T };

      const functionMocks = fns.generateFunctionMocks(utils)(
        proto as PluginArray,
        itemMainProp,
        magicArray
      );

      const magicArrayObjProxy = new Proxy(magicArrayObj, {
        get(target: T[], key: string | symbol): unknown {
          if (key === 'item') {
            return functionMocks.item;
          }
          if (key === 'namedItem') {
            return functionMocks.namedItem;
          }
          if (proto === PluginArray.prototype && key === 'refresh') {
            return functionMocks.refresh;
          }
          return utils.cache.Reflect.get(target, key, target);
        },
        ownKeys(_target: T[]): (string | symbol)[] {
          const keys: string[] = [];
          const typeProps = magicArray.map(
            (mt) => (mt as unknown as Record<string, string>)[itemMainProp]
          );
          typeProps.forEach((_, i) => keys.push(`${i}`));
          typeProps.forEach((propName) => {
            if (propName) keys.push(propName);
          });
          return keys;
        },
      });

      return magicArrayObjProxy;
    };

  fns.generateMimeTypeArray = (utils: StealthUtils, fns: PluginsFns) => (
    mimeTypesData: MimeTypeDataInternal[]
  ): MimeTypeArray => {
    return fns.generateMagicArray(utils, fns)(
      mimeTypesData,
      MimeTypeArray.prototype,
      MimeType.prototype,
      'type'
    ) as unknown as MimeTypeArray;
  };

  const data: { mimeTypes: MimeTypeDataInternal[]; plugins: PluginDataInternal[] } = {
    mimeTypes: [
      {
        type: 'application/pdf',
        suffixes: 'pdf',
        description: '',
        __pluginName: 'Chrome PDF Viewer',
      },
      {
        type: 'application/x-google-chrome-pdf',
        suffixes: 'pdf',
        description: 'Portable Document Format',
        __pluginName: 'Chrome PDF Plugin',
      },
      {
        type: 'application/x-nacl',
        suffixes: '',
        description: 'Native Client Executable',
        __pluginName: 'Native Client',
      },
      {
        type: 'application/x-pnacl',
        suffixes: '',
        description: 'Portable Native Client Executable',
        __pluginName: 'Native Client',
      },
    ],
    plugins: [
      {
        name: 'Chrome PDF Plugin',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        __mimeTypes: ['application/x-google-chrome-pdf'],
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        description: '',
        __mimeTypes: ['application/pdf'],
      },
      {
        name: 'Native Client',
        filename: 'internal-nacl-plugin',
        description: '',
        __mimeTypes: ['application/x-nacl', 'application/x-pnacl'],
      },
    ],
  };

  const hasPlugins = 'plugins' in navigator && navigator.plugins.length > 0;
  if (hasPlugins) {
    return;
  }

  const mimeTypes = fns.generateMimeTypeArray(utils, fns)(data.mimeTypes) as unknown as Record<
    string,
    MimeType
  >;
  const plugins = fns.generatePluginArray(utils, fns)(data.plugins) as unknown as Record<
    string,
    Plugin & Record<number, MimeType>
  >;

  for (const pluginData of data.plugins) {
    pluginData.__mimeTypes.forEach((type, index) => {
      const plugin = plugins[pluginData.name];
      const mimeType = mimeTypes[type];
      if (plugin && mimeType) {
        plugin[index] = mimeType;
        (plugins as unknown as Record<string, MimeType>)[type] = mimeType;
        Object.defineProperty(mimeType, 'enabledPlugin', {
          value: JSON.parse(JSON.stringify(plugin)),
          writable: false,
          enumerable: false,
          configurable: false,
        });
      }
    });
  }

  const patchNavigator = (name: string, value: unknown): void => {
    utils.replaceProperty(Object.getPrototypeOf(navigator), name, {
      get(): unknown {
        return value;
      },
    });
  };

  patchNavigator('mimeTypes', mimeTypes);
  patchNavigator('plugins', plugins);
})();
