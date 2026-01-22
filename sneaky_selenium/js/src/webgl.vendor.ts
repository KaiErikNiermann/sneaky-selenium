// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js
/// <reference path="./types.d.ts" />

// WebGL parameter constants
const UNMASKED_VENDOR_WEBGL = 37445 as const;
const UNMASKED_RENDERER_WEBGL = 37446 as const;

type WebGLParameter = typeof UNMASKED_VENDOR_WEBGL | typeof UNMASKED_RENDERER_WEBGL | number;

((vendor?: string | null, renderer?: string | null) => {
  const getParameterProxyHandler: ProxyHandler<
    WebGLRenderingContext['getParameter'] | WebGL2RenderingContext['getParameter']
  > = {
    apply: function (
      target: WebGLRenderingContext['getParameter'],
      ctx: WebGLRenderingContext | WebGL2RenderingContext,
      args: [WebGLParameter]
    ): unknown {
      const param = args[0];

      if (param === UNMASKED_VENDOR_WEBGL) {
        return vendor ?? 'Intel Inc.';
      }

      if (param === UNMASKED_RENDERER_WEBGL) {
        return renderer ?? 'Intel Iris OpenGL Engine';
      }

      return utils.cache.Reflect.apply(target, ctx, args);
    },
  };

  const addProxy = (obj: object, propName: string): void => {
    utils.replaceWithProxy(obj as Record<string, unknown>, propName, getParameterProxyHandler);
  };

  addProxy(WebGLRenderingContext.prototype, 'getParameter');
  addProxy(WebGL2RenderingContext.prototype, 'getParameter');
});
