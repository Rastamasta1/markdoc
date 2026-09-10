import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkgPath = resolve(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

describe('package.json exports map', function () {
  it('preserves the existing main and types fields', function () {
    expect(pkg.main).toEqual('dist/index.js');
    expect(pkg.types).toEqual('dist/index.d.ts');
  });

  it('defines an exports field', function () {
    expect(pkg.exports).toBeDefined();
    expect(typeof pkg.exports).toEqual('object');
  });

  it('has a "." entry whose keys are ordered types, import, require, default', function () {
    const dot = pkg.exports['.'];
    expect(dot).toBeDefined();
    expect(Object.keys(dot)).toEqual(['types', 'import', 'require', 'default']);
  });

  it('points the "." entry conditions at the correct dist files', function () {
    const dot = pkg.exports['.'];
    expect(dot.types).toEqual('./dist/index.d.ts');
    expect(dot.import).toEqual('./dist/index.mjs');
    expect(dot.require).toEqual('./dist/index.js');
    expect(dot.default).toEqual('./dist/index.js');
  });

  it('exposes package.json itself via exports', function () {
    expect(pkg.exports['./package.json']).toEqual('./package.json');
  });
});
