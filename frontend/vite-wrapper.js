import { createRequire } from 'module';
const require = createRequire(import.meta.url);

if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params?.detail;
    }
  };
}

import('./node_modules/vite/dist/node/cli.js');
