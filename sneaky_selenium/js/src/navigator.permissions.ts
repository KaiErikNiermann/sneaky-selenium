// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js
/// <reference path="./types.d.ts" />

interface PermissionDescriptor {
  name: PermissionName | 'notifications';
}

(() => {
  const handler: ProxyHandler<(desc: PermissionDescriptor) => Promise<PermissionStatus>> = {
    apply: function (
      _target: (desc: PermissionDescriptor) => Promise<PermissionStatus>,
      _ctx: Permissions,
      args: unknown[]
    ): Promise<PermissionStatus> {
      const param = args[0] as PermissionDescriptor | undefined;

      if (param?.name === 'notifications') {
        const result = { state: Notification.permission } as PermissionStatus;
        Object.setPrototypeOf(result, PermissionStatus.prototype);
        return Promise.resolve(result);
      }

      return utils.cache.Reflect.apply(
        _target as unknown as (...args: unknown[]) => Promise<PermissionStatus>,
        _ctx,
        args
      ) as Promise<PermissionStatus>;
    },
  };

  utils.replaceWithProxy(
    Object.getPrototypeOf(window.navigator.permissions) as Record<string, unknown>,
    'query',
    handler
  );
})();
