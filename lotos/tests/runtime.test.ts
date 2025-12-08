import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { executeLocalPython } from '../src/tools/runtime.js';

describe('runtime.exec local implementation', () => {
  it('runs python code within the requested directory', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lotos-runtime-'));
    try {
      const result = await executeLocalPython('import os;print(os.getcwd())', tmpDir);
      expect(result.exitCode).toBe(0);
      const reportedCwd = result.stdout.trim();
      const [actualCwd, expectedCwd] = await Promise.all([fs.realpath(reportedCwd), fs.realpath(tmpDir)]);
      expect(actualCwd).toBe(expectedCwd);
      expect(result.stderr).toBe('');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
