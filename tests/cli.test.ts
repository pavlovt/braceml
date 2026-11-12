import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (...args: string[]) =>
  spawnSync(process.execPath, ['--import', 'tsx', 'packages/cli/src/index.ts', ...args], { cwd: root, encoding: 'utf8' });

describe('braceml CLI with a missing input file', () => {
  it.each([
    [['missing.braceml'], 'missing.braceml'],
    [['fmt', 'missing.braceml'], 'missing.braceml'],
    [['convert', 'missing.html'], 'missing.html'],
  ])('braceml %j prints one line and exits 1', (args, file) => {
    const { status, stderr } = run(...args);
    expect(status).toBe(1);
    expect(stderr.trim()).toBe(`Can't read '${file}': file not found.`);
  });

  it('still surfaces other read errors', () => {
    const { status, stderr } = run('packages');
    expect(status).not.toBe(0);
    expect(stderr).toContain('EISDIR');
    expect(stderr).not.toContain("Can't read");
  });
});
