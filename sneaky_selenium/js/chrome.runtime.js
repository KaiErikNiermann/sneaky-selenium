// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js
/// <reference path="./types.d.ts" />
((runOnInsecureOrigins) => {
    const STATIC_DATA = {
        OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update',
        },
        OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic',
        },
        PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
        },
        PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64',
        },
        PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win',
        },
        RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available',
        },
    };
    if (!window.chrome) {
        Object.defineProperty(window, 'chrome', {
            writable: true,
            enumerable: true,
            configurable: false,
            value: {},
        });
    }
    const existsAlready = 'runtime' in window.chrome;
    const isNotSecure = !window.location.protocol.startsWith('https');
    if (existsAlready || (isNotSecure && !runOnInsecureOrigins)) {
        return;
    }
    window.chrome.runtime = {
        ...STATIC_DATA,
        get id() {
            return undefined;
        },
        connect: null,
        sendMessage: null,
    };
    const makeCustomRuntimeErrors = (preamble, method, extensionId) => ({
        NoMatchingSignature: new TypeError(preamble + 'No matching signature.'),
        MustSpecifyExtensionID: new TypeError(preamble +
            `${method} called from a webpage must specify an Extension ID (string) for its first argument.`),
        InvalidExtensionID: new TypeError(preamble + `Invalid extension id: '${extensionId}'`),
    });
    const isValidExtensionID = (str) => str.length === 32 && /^[a-p]+$/i.test(str.toLowerCase());
    const sendMessageHandler = {
        apply: function (_target, _ctx, args) {
            const extensionId = args[0];
            const options = args[2];
            const responseCallback = args[3];
            const errorPreamble = 'Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function responseCallback): ';
            const Errors = makeCustomRuntimeErrors(errorPreamble, 'chrome.runtime.sendMessage()', extensionId ?? '');
            const noArguments = args.length === 0;
            const tooManyArguments = args.length > 4;
            const incorrectOptions = options !== undefined && typeof options !== 'object';
            const incorrectResponseCallback = responseCallback !== undefined && typeof responseCallback !== 'function';
            if (noArguments || tooManyArguments || incorrectOptions || incorrectResponseCallback) {
                throw Errors.NoMatchingSignature;
            }
            if (args.length < 2) {
                throw Errors.MustSpecifyExtensionID;
            }
            if (typeof extensionId !== 'string') {
                throw Errors.NoMatchingSignature;
            }
            if (!isValidExtensionID(extensionId)) {
                throw Errors.InvalidExtensionID;
            }
            return undefined;
        },
    };
    utils.mockWithProxy(window.chrome.runtime, 'sendMessage', function sendMessage() { }, sendMessageHandler);
    const connectHandler = {
        apply: function (_target, _ctx, args) {
            const extensionId = args[0];
            const connectInfo = args[1];
            const errorPreamble = 'Error in invocation of runtime.connect(optional string extensionId, optional object connectInfo): ';
            const Errors = makeCustomRuntimeErrors(errorPreamble, 'chrome.runtime.connect()', typeof extensionId === 'string' ? extensionId : '');
            const noArguments = args.length === 0;
            const emptyStringArgument = args.length === 1 && extensionId === '';
            if (noArguments || emptyStringArgument) {
                throw Errors.MustSpecifyExtensionID;
            }
            const tooManyArguments = args.length > 2;
            const incorrectConnectInfoType = connectInfo !== undefined && typeof connectInfo !== 'object';
            if (tooManyArguments || incorrectConnectInfoType) {
                throw Errors.NoMatchingSignature;
            }
            const extensionIdIsString = typeof extensionId === 'string';
            if (extensionIdIsString && extensionId === '') {
                throw Errors.MustSpecifyExtensionID;
            }
            if (extensionIdIsString && !isValidExtensionID(extensionId)) {
                throw Errors.InvalidExtensionID;
            }
            const validateConnectInfo = (ci) => {
                if (args.length > 1) {
                    throw Errors.NoMatchingSignature;
                }
                if (Object.keys(ci).length === 0) {
                    throw Errors.MustSpecifyExtensionID;
                }
                Object.entries(ci).forEach(([k, v]) => {
                    const isExpected = ['name', 'includeTlsChannelId'].includes(k);
                    if (!isExpected) {
                        throw new TypeError(errorPreamble + `Unexpected property: '${k}'.`);
                    }
                    const MismatchError = (propName, expected, found) => new TypeError(errorPreamble +
                        `Error at property '${propName}': Invalid type: expected ${expected}, found ${found}.`);
                    if (k === 'name' && typeof v !== 'string') {
                        throw MismatchError(k, 'string', typeof v);
                    }
                    if (k === 'includeTlsChannelId' && typeof v !== 'boolean') {
                        throw MismatchError(k, 'boolean', typeof v);
                    }
                });
            };
            if (typeof extensionId === 'object') {
                validateConnectInfo(extensionId);
                throw Errors.MustSpecifyExtensionID;
            }
            return utils.patchToStringNested(makeConnectResponse());
        },
    };
    utils.mockWithProxy(window.chrome.runtime, 'connect', function connect() { }, connectHandler);
    function makeConnectResponse() {
        const onSomething = () => ({
            addListener: function addListener() { },
            dispatch: function dispatch() { },
            hasListener: function hasListener() { },
            hasListeners: function hasListeners() {
                return false;
            },
            removeListener: function removeListener() { },
        });
        const response = {
            name: '',
            sender: undefined,
            disconnect: function disconnect() { },
            onDisconnect: onSomething(),
            onMessage: onSomething(),
            postMessage: function postMessage(message) {
                if (message === undefined) {
                    throw new TypeError('Insufficient number of arguments.');
                }
                throw new Error('Attempting to use a disconnected port object');
            },
        };
        return response;
    }
});
