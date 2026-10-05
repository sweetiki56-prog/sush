import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('generated map visibility', () => {
  it('keeps actors and interactive props out of severe initial-position occlusion', () => {
    const report = execFileSync(process.execPath, ['tools/audit-prop-occlusion.mjs', '--check'], { encoding: 'utf8' });
    expect(report).not.toContain('Severe initial-position occlusion detected');
  }, 20_000);
});
