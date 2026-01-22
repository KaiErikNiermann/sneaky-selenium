// Hardware fingerprint evasion - deviceMemory and hardwareConcurrency
/// <reference path="./types.d.ts" />

/**
 * Modern fingerprinting relies on hardware metrics like:
 * - navigator.deviceMemory (approximate RAM in GB)
 * - navigator.hardwareConcurrency (number of logical CPU cores)
 * 
 * Headless browsers often report unusual values that can be detected.
 * This evasion sets realistic values for these properties.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency
 */

interface HardwareParams {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

((params: HardwareParams = {}) => {
  // Default to common values - 8GB RAM and 8 cores
  const deviceMemory = params.deviceMemory ?? 8;
  const hardwareConcurrency = params.hardwareConcurrency ?? 8;

  // Only patch if values look suspicious (0, undefined, or very low)
  const currentMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  const currentCores = navigator.hardwareConcurrency;

  // Patch deviceMemory if it's missing or suspicious
  if (currentMemory === undefined || currentMemory < 2) {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'deviceMemory', {
      get: () => deviceMemory,
      enumerable: true,
      configurable: true,
    });
  }

  // Patch hardwareConcurrency if it's missing or suspicious (< 2 cores is rare)
  if (currentCores === undefined || currentCores < 2) {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'hardwareConcurrency', {
      get: () => hardwareConcurrency,
      enumerable: true,
      configurable: true,
    });
  }
});
