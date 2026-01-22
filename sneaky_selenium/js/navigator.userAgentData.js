// Navigator User-Agent Client Hints evasion for modern browsers
// https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
/// <reference path="./types.d.ts" />
((params = {}) => {
    // Default values for a typical Chrome on Windows setup
    const defaultBrands = [
        { brand: 'Chromium', version: '120' },
        { brand: 'Google Chrome', version: '120' },
        { brand: 'Not_A Brand', version: '8' },
    ];
    const config = {
        brands: params.brands ?? defaultBrands,
        mobile: params.mobile ?? false,
        platform: params.platform ?? 'Windows',
        platformVersion: params.platformVersion ?? '15.0.0',
        architecture: params.architecture ?? 'x86',
        bitness: params.bitness ?? '64',
        model: params.model ?? '',
        uaFullVersion: params.uaFullVersion ?? '120.0.0.0',
    };
    // Always override userAgentData with our configured values
    // Chrome provides native userAgentData in secure contexts, but we want to
    // control the exact values to match our user_agent override
    const lowEntropyData = {
        brands: config.brands,
        mobile: config.mobile,
        platform: config.platform,
    };
    const highEntropyData = {
        ...lowEntropyData,
        architecture: config.architecture,
        bitness: config.bitness,
        formFactor: [],
        fullVersionList: config.brands.map((b) => ({
            brand: b.brand,
            version: config.uaFullVersion,
        })),
        model: config.model,
        platformVersion: config.platformVersion,
        uaFullVersion: config.uaFullVersion,
        wow64: false,
    };
    const userAgentData = {
        brands: lowEntropyData.brands,
        mobile: lowEntropyData.mobile,
        platform: lowEntropyData.platform,
        getHighEntropyValues(hints) {
            return new Promise((resolve) => {
                const result = {};
                for (const hint of hints) {
                    if (hint in highEntropyData) {
                        result[hint] =
                            highEntropyData[hint];
                    }
                }
                resolve(result);
            });
        },
        toJSON() {
            return lowEntropyData;
        },
    };
    // Make it look native
    Object.defineProperty(userAgentData.getHighEntropyValues, 'name', {
        value: 'getHighEntropyValues',
    });
    Object.defineProperty(userAgentData.toJSON, 'name', { value: 'toJSON' });
    // Patch toString for native appearance
    utils.patchToString(userAgentData.getHighEntropyValues);
    utils.patchToString(userAgentData.toJSON);
    Object.defineProperty(Object.getPrototypeOf(navigator), 'userAgentData', {
        get: () => userAgentData,
        enumerable: true,
        configurable: true,
    });
});
