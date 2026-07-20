import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = fs.readFileSync(
  path.join(__dirname, 'image-generation-anchor.scss'),
  'utf8'
);

describe('image generation anchor desktop visibility styles', () => {
  it('keeps opaque fallback colors for batch slot states', () => {
    expect(styles).toMatch(
      /stack-slot--ready[\s\S]*?background-color:\s*#fff3cf[\s\S]*?,\s*#fff3cf;/
    );
    expect(styles).toMatch(
      /stack-slot--failed[\s\S]*?background-color:\s*#fee2e2[\s\S]*?,\s*#fee2e2;/
    );
    expect(styles).toMatch(
      /phase-generating[\s\S]*?stack-slot[\s\S]*?background-color:\s*#fbdc92[\s\S]*?,\s*#fbdc92;/
    );
  });

  it('does not animate the generation border back to a faint color', () => {
    const pulse = styles.match(
      /@keyframes image-generation-anchor-card-pulse\s*\{([\s\S]*?)\n\}/
    )?.[1];

    expect(pulse).toBeTruthy();
    expect(pulse).not.toContain('rgba(233, 197, 106, 0.32)');
    expect(pulse).toContain('rgba(217, 119, 6, 0.72)');
    expect(pulse).toContain('rgba(180, 83, 9, 0.82)');
  });

  it('provides a reduced-effects desktop foreignObject path', () => {
    expect(styles).toContain('.opentu-desktop .image-generation-anchor');
    expect(styles).toContain('-webkit-backdrop-filter: none');
    expect(styles).toContain('-webkit-mask-image: none');
  });
});
