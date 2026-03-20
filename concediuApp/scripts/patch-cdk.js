/**
 * Patch @angular/cdk to add missing _VIEW_REPEATER_STRATEGY token
 * required by @nebular/theme 17.
 * This token was removed in CDK 21.2+.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@angular',
  'cdk',
  'fesm2022',
  'collections.mjs'
);

if (!fs.existsSync(filePath)) {
  console.log('CDK collections.mjs not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('_VIEW_REPEATER_STRATEGY')) {
  console.log('CDK already patched, skipping.');
  process.exit(0);
}

const patch = `
import { InjectionToken as _InjectionToken } from '@angular/core';
const _VIEW_REPEATER_STRATEGY = new _InjectionToken('_VIEW_REPEATER_STRATEGY');
export { _VIEW_REPEATER_STRATEGY };`;

content += patch;
fs.writeFileSync(filePath, content, 'utf8');
console.log('CDK patched: added _VIEW_REPEATER_STRATEGY token.');
