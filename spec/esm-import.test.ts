import { execSync, execFileSync } from 'child_process';
import { resolve } from 'path';

type ChildResult = { status: number; stdout: string; stderr: string };

describe('ESM/CJS consumption of the built package', function () {
  const rootDir = resolve(__dirname, '..');

  beforeAll(function () {
    // Build once for the whole suite so dist/index.mjs, dist/index.js, and
    // dist/index.d.ts all reflect current source before any child process
    // tries to resolve the package by its own name.
    execSync('npm run build', {
      cwd: rootDir,
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 50,
    });
  });

  function runNode(args: string[]): ChildResult {
    try {
      const stdout = execFileSync(process.execPath, args, {
        cwd: rootDir,
        encoding: 'utf8',
      });
      return { status: 0, stdout, stderr: '' };
    } catch (err: any) {
      return {
        status: typeof err.status === 'number' ? err.status : 1,
        stdout: (err.stdout || '').toString(),
        stderr: (err.stderr || '').toString(),
      };
    }
  }

  function parseChildJson(result: ChildResult, label: string): any {
    try {
      return JSON.parse(result.stdout.trim());
    } catch {
      throw new Error(
        `${label}: could not parse child stdout as JSON.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
    }
  }

  function assertSuccess(result: ChildResult, label: string) {
    if (result.status !== 0) {
      throw new Error(
        `${label} exited with status ${result.status}.\nstderr:\n${result.stderr}`
      );
    }
  }

  it('a spawned plain-Node ESM process imports @markdoc/markdoc by its own name', function () {
    // Node resolves a bare specifier matching the package's own "name" field
    // through its exports map (self-reference) — this is exactly the
    // reproduction for the issue this test guards against.
    const script = [
      "import { Node, parse, transform } from '@markdoc/markdoc';",
      "import Markdoc from '@markdoc/markdoc';",
      'console.log(JSON.stringify({',
      '  node: typeof Node,',
      '  parse: typeof parse,',
      '  transform: typeof transform,',
      '  dflt: typeof Markdoc,',
      '}));',
    ].join('\n');

    const label = 'node --input-type=module --eval (self-reference ESM import)';
    const result = runNode(['--input-type=module', '--eval', script]);
    assertSuccess(result, label);

    const parsed = parseChildJson(result, label);

    expect(parsed.node).toEqual('function');
    expect(parsed.parse).toEqual('function');
    expect(parsed.transform).toEqual('function');
    expect(['object', 'function']).toContain(parsed.dflt);
  });

  it('a spawned CommonJS process can require(\'@markdoc/markdoc\')', function () {
    const script = [
      "const m = require('@markdoc/markdoc');",
      'console.log(JSON.stringify({ parse: typeof m.parse, dflt: typeof m.default }));',
    ].join('\n');

    const label = 'node --eval (CommonJS require)';
    const result = runNode(['--eval', script]);
    assertSuccess(result, label);

    const parsed = parseChildJson(result, label);

    expect(parsed.parse).toEqual('function');
  });

  it('dist/index.mjs is a valid ES module when imported directly (control)', function () {
    // No package-name resolution here — this isolates whether the built
    // file itself is valid ESM, versus whether the exports map correctly
    // routes the bare package-name specifier to it.
    const script = [
      "import Markdoc from './dist/index.mjs';",
      'console.log(JSON.stringify({ dflt: typeof Markdoc }));',
    ].join('\n');

    const label = 'node --input-type=module --eval (direct dist/index.mjs import)';
    const result = runNode(['--input-type=module', '--eval', script]);
    assertSuccess(result, label);

    const parsed = parseChildJson(result, label);

    expect(['object', 'function']).toContain(parsed.dflt);
  });

  it("a spawned plain-Node ESM process resolves '@markdoc/markdoc/react'", function () {
    const label = 'node --input-type=module --eval (react subpath import)';
    const result = runNode([
      '--input-type=module',
      '--eval',
      "import * as r from '@markdoc/markdoc/react'; console.log(typeof r)",
    ]);
    assertSuccess(result, label);
    expect(result.stdout.trim()).toEqual('object');
  });
});
