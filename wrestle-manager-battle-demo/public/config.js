
window.WM_DEMO_CONFIG_OVERRIDES = {"productLinks":{"booth":"","dlsite":"","fanza":""}};
(function () {
  'use strict';

  const defaults = {
    storageNamespace: 'wrestle-manager-demo-v1',
    productLinks: {
      booth: '',
      dlsite: '',
      fanza: '',
    },
  };

  const overrides = window.WM_DEMO_CONFIG_OVERRIDES || {};
  window.WM_DEMO_CONFIG = Object.freeze({
    ...defaults,
    ...overrides,
    productLinks: Object.freeze({
      ...defaults.productLinks,
      ...(overrides.productLinks || {}),
    }),
  });
})();
