// https://github.com/berstend/puppeteer-extra/tree/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.plugins
/// <reference path="./types.d.ts" />
(() => {
    const fns = {};
    fns.generatePluginArray = (utils, fns) => (pluginsData) => {
        return fns.generateMagicArray(utils, fns)(pluginsData, PluginArray.prototype, Plugin.prototype, 'name');
    };
    fns.generateFunctionMocks = (utils) => (proto, itemMainProp, dataArray) => ({
        item: utils.createProxy(proto.item ?? ((_index) => null), {
            apply(_target, _ctx, args) {
                if (!args.length) {
                    throw new TypeError(`Failed to execute 'item' on '${proto[Symbol.toStringTag] ?? 'Array'}': 1 argument required, but only 0 present.`);
                }
                const isInteger = args[0] !== null && Number.isInteger(Number(args[0]));
                return (isInteger ? dataArray[Number(args[0])] : dataArray[0]) ?? null;
            },
        }),
        namedItem: utils.createProxy(proto.namedItem ?? ((_name) => null), {
            apply(_target, _ctx, args) {
                if (!args.length) {
                    throw new TypeError(`Failed to execute 'namedItem' on '${proto[Symbol.toStringTag] ?? 'Array'}': 1 argument required, but only 0 present.`);
                }
                return (dataArray.find((mt) => mt[itemMainProp] === args[0]) ?? null);
            },
        }),
        refresh: proto.refresh
            ? utils.createProxy(proto.refresh, {
                apply() {
                    return undefined;
                },
            })
            : undefined,
    });
    fns.generateMagicArray = (utils, fns) => function (dataArray = [], proto = MimeTypeArray.prototype, itemProto = MimeType.prototype, itemMainProp = 'type') {
        const defineProp = (obj, prop, value) => {
            Object.defineProperty(obj, prop, {
                value,
                writable: false,
                enumerable: false,
                configurable: false,
            });
        };
        const makeItem = (data) => {
            const item = {};
            for (const prop of Object.keys(data)) {
                if (prop.startsWith('__')) {
                    continue;
                }
                defineProp(item, prop, data[prop]);
            }
            return Object.create(itemProto, Object.getOwnPropertyDescriptors(item));
        };
        const magicArray = [];
        dataArray.forEach((data) => {
            magicArray.push(makeItem(data));
        });
        magicArray.forEach((entry) => {
            const key = entry[itemMainProp];
            if (key) {
                defineProp(magicArray, key, entry);
            }
        });
        const descriptors = {
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
        const magicArrayObj = Object.create(proto, descriptors);
        const functionMocks = fns.generateFunctionMocks(utils)(proto, itemMainProp, magicArray);
        const magicArrayObjProxy = new Proxy(magicArrayObj, {
            get(target, key) {
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
            ownKeys(_target) {
                const keys = [];
                const typeProps = magicArray.map((mt) => mt[itemMainProp]);
                typeProps.forEach((_, i) => keys.push(`${i}`));
                typeProps.forEach((propName) => {
                    if (propName)
                        keys.push(propName);
                });
                return keys;
            },
        });
        return magicArrayObjProxy;
    };
    fns.generateMimeTypeArray = (utils, fns) => (mimeTypesData) => {
        return fns.generateMagicArray(utils, fns)(mimeTypesData, MimeTypeArray.prototype, MimeType.prototype, 'type');
    };
    const data = {
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
    const mimeTypes = fns.generateMimeTypeArray(utils, fns)(data.mimeTypes);
    const plugins = fns.generatePluginArray(utils, fns)(data.plugins);
    for (const pluginData of data.plugins) {
        pluginData.__mimeTypes.forEach((type, index) => {
            const plugin = plugins[pluginData.name];
            const mimeType = mimeTypes[type];
            if (plugin && mimeType) {
                plugin[index] = mimeType;
                plugins[type] = mimeType;
                Object.defineProperty(mimeType, 'enabledPlugin', {
                    value: JSON.parse(JSON.stringify(plugin)),
                    writable: false,
                    enumerable: false,
                    configurable: false,
                });
            }
        });
    }
    const patchNavigator = (name, value) => {
        utils.replaceProperty(Object.getPrototypeOf(navigator), name, {
            get() {
                return value;
            },
        });
    };
    patchNavigator('mimeTypes', mimeTypes);
    patchNavigator('plugins', plugins);
})();
