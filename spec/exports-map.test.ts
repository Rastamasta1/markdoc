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
    // `stdio: 'inherit'` would interleave the build's own (very verbose)
    // esbuild/tsc output into this process's stdout, which can bury or push
    // out the test runner's final summary line that downstream tooling
    // greps for. Capture the child's output instead, and only surface it
    // if the build actually fails, so a passing build always leaves a
    // clean, parseable test-runner summary.
    try {
      execSync('npm run build', {
        cwd: rootDir,
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 50,
      });
    } catch (err: any) {
      const output = [err?.stdout, err?.stderr]
        .filter(Boolean)
        .map((buf) => buf.toString())
        .join('\n');
      throw new Error(`npm run build failed:\n${output || err?.message || err}`);
    }

    expect(existsSync(resolve(rootDir, 'dist/index.js'))).toBeTrue();
    expect(existsSync(resolve(rootDir, 'dist/index.mjs'))).toBeTrue();
    expect(existsSync(resolve(rootDir, 'dist/index.d.ts'))).toBeTrue();
  });
});
