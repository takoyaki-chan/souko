
window.WM_DEMO_CONFIG_OVERRIDES = {"productLinks":{"booth":"","dlsite":"","fanza":""},"promotionLinks":{"primaryUrl":"","primaryLabel":"","trialUrl":"","followXUrl":""}};
(function () {
  'use strict';

  const defaults = {
    storageNamespace: 'wrestle-manager-demo-v1',
    productLinks: {
      booth: '',
      dlsite: '',
      fanza: '',
    },
    promotionLinks: {
      // Set either link when it is ready. Empty values deliberately hide the corresponding CTA.
      primaryUrl: '',
      primaryLabel: '',
      trialUrl: '',
      followXUrl: '',
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
    promotionLinks: Object.freeze({
      ...defaults.promotionLinks,
      ...(overrides.promotionLinks || {}),
    }),
  });
})();
