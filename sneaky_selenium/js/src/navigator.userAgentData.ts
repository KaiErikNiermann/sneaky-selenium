// Navigator User-Agent Client Hints evasion for modern browsers
// https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
/// <reference path="./types.d.ts" />

/**
 * User-Agent Client Hints (UA-CH) is the modern replacement for the User-Agent string.
 * Modern bot detection heavily relies on UA-CH for fingerprinting.
 * This evasion ensures navigator.userAgentData returns realistic values.
 * 
 * @since Chrome 90+, Edge 90+
 * @see https://web.dev/user-agent-client-hints/
 */

interface UADataBrand {
  brand: string;
  version: string;
}

interface UADataValues {
  brands: UADataBrand[];
  mobile: boolean;
  platform: string;
}

interface HighEntropyValues extends UADataValues {
  architecture: string;
  bitness: string;
  formFactor: string[];
  fullVersionList: UADataBrand[];
  model: string;
  platformVersion: string;
  uaFullVersion: string;
  wow64: boolean;
}

interface NavigatorUADataParams {
  brands?: UADataBrand[];
  mobile?: boolean;
  platform?: string;
  platformVersion?: string;
  architecture?: string;
  bitness?: string;
  model?: string;
  uaFullVersion?: string;
}

((params: NavigatorUADataParams = {}) => {
  // Default values for a typical Chrome on Windows setup
  const defaultBrands: UADataBrand[] = [
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

  const lowEntropyData: UADataValues = {
    brands: config.brands,
    mobile: config.mobile,
    platform: config.platform,
  };

  const highEntropyData: HighEntropyValues = {
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

    getHighEntropyValues(hints: string[]): Promise<Partial<HighEntropyValues>> {
      return new Promise((resolve) => {
        const result: Partial<HighEntropyValues> = {};
        for (const hint of hints) {
          if (hint in highEntropyData) {
            (result as Record<string, unknown>)[hint] =
              highEntropyData[hint as keyof HighEntropyValues];
          }
        }
        resolve(result);
      });
    },

    toJSON(): UADataValues {
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
