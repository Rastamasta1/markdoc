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

  it('has a "./react" entry whose import and default point at dist/react.js', function () {
    const react = pkg.exports['./react'];
    expect(react).toBeDefined();
    expect(react.import).toEqual('./dist/react.js');
    expect(react.default).toEqual('./dist/react.js');
  });
});

describe('exports map targets are covered by package.json "files"', function () {
  function collectStringTargets(value, results = []) {
    if (typeof value === 'string') {
      results.push(value);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) collectStringTargets(v, results);
    }
    return results;
  }

  function isCoveredByFiles(target, files) {
    const normalizedTarget = target.replace(/^\.\//, '');
    return files.some((entry) => {
      const normalizedEntry = entry.replace(/^\.\//, '');
      return (
        normalizedTarget === normalizedEntry ||
        normalizedTarget.startsWith(normalizedEntry + '/')
      );
    });
  }

  it('walks every string target in the exports map and asserts "files" covers it', function () {
    const targets = collectStringTargets(pkg.exports).filter(
      (target) => target !== './package.json'
    );

    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      expect(isCoveredByFiles(target, pkg.files)).toBeTrue();
    }
  });
});

describe('build.js entry points', function () {
  it('names src/renderers/react/react.ts as an entry point for the build', function () {
    const buildPath = resolve(__dirname, '../build.js');
    const buildSource = readFileSync(buildPath, 'utf8');
    expect(buildSource).toContain(
      "entryPoints: ['src/renderers/react/react.ts']"
    );
  });
});
