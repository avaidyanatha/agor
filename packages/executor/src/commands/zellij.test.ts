import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getZellijSocketDir } from './zellij.js';

describe('getZellijSocketDir', () => {
  it('preserves an explicit environment override', () => {
    expect(getZellijSocketDir('/custom/zellij-sockets', 1000)).toBe('/custom/zellij-sockets');
  });

  it('keeps a real Agor session socket comfortably below the macOS limit', () => {
    const socketDir = getZellijSocketDir(undefined, 4_294_967_295);
    const sessionName = `agor-${'a'.repeat(24)}`;
    const socketPath = path.join(socketDir, 'contract_version_1', sessionName);

    expect(Buffer.byteLength(socketPath)).toBeLessThan(80);
    expect(Buffer.byteLength(socketPath)).toBeLessThan(103);
  });

  it('separates fallback directories by Unix user', () => {
    expect(getZellijSocketDir(undefined, 1000)).toBe('/tmp/agor-zellij-1000');
    expect(getZellijSocketDir(undefined, 1001)).toBe('/tmp/agor-zellij-1001');
  });
});
