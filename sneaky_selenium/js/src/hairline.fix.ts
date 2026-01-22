// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/hairline.fix/index.js
/// <reference path="./types.d.ts" />

(() => {
  const elementDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  );

  if (!elementDescriptor) return;

  Object.defineProperty(HTMLDivElement.prototype, 'offsetHeight', {
    ...elementDescriptor,
    get: function (this: HTMLDivElement): number {
      if (this.id === 'modernizr') {
        return 1;
      }
      return elementDescriptor.get?.call(this) ?? 0;
    },
  });
})();
