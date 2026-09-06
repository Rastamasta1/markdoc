import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('package.json exports map', function () {
  const rootDir = resolve(__dirname, '..');
  const packageJsonPath = resolve(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  it('keeps main, module, and types unchanged', function () {
    expect(pkg.main).toEqual('dist/index.js');
    expect(pkg.module).toEqual('dist/index.mjs');
    expect(pkg.types).toEqual('dist/index.d.ts');
  });

  it('defines the "." export with types listed first, in the correct order', function () {
    const dot = pkg.exports && pkg.exports['.'];
    expect(dot).toBeDefined();

    // TypeScript requires "types" to be the first condition in the map.
    const conditions = Object.keys(dot);
    expect(conditions).toEqual(['types', 'import', 'require', 'default']);

    expect(dot.types).toEqual('./dist/index.d.ts');
    expect(dot.import).toEqual('./dist/index.mjs');
    expect(dot.require).toEqual('./dist/index.js');
    expect(dot.default).toEqual('./dist/index.js');
  });

  it('exposes "./package.json" for tooling that resolves it directly', function () {
    expect(pkg.exports && pkg.exports['./package.json']).toEqual(
      './package.json'
    );
  });

  it('still emits dist/index.js, dist/index.mjs, and dist/index.d.ts after building', function () {
    execSync('npm run build', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    expect(existsSync(resolve(rootDir, 'dist/index.js'))).toBeTrue();
    expect(existsSync(resolve(rootDir, 'dist/index.mjs'))).toBeTrue();
    expect(existsSync(resolve(rootDir, 'dist/index.d.ts'))).toBeTrue();
  });
});
