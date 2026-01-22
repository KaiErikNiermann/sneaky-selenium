// Hardware fingerprint evasion - deviceMemory and hardwareConcurrency
/// <reference path="./types.d.ts" />
((params = {}) => {
    // Default to common values - 8GB RAM and 8 cores
    const deviceMemory = params.deviceMemory ?? 8;
    const hardwareConcurrency = params.hardwareConcurrency ?? 8;
    // Only patch if values look suspicious (0, undefined, or very low)
    const currentMemory = navigator.deviceMemory;
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
