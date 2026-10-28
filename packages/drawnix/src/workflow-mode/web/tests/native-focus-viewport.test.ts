import { expect, it } from "vitest";
import { focusViewportForNode } from "../src/lib/canvas/canvas-node-geometry";

it("centers an ordinary node and bounds its zoom", () => {
    const node = { position: { x: 1000, y: -500 }, width: 340, height: 240 };
    const viewport = focusViewportForNode(node, { width: 900, height: 600 });
    expect(viewport.x + (node.position.x + node.width / 2) * viewport.k).toBeCloseTo(450);
    expect(viewport.y + (node.position.y + node.height / 2) * viewport.k).toBeCloseTo(300);
    expect(viewport.k).toBe(1);
});

it("keeps a node's open panel above the bottom dock when it fits", () => {
    const node = { position: { x: 0, y: 0 }, width: 340, height: 500 };
    const size = { width: 900, height: 700 };
    const viewport = focusViewportForNode(node, size, { below: 316, bottomInset: 76 });
    expect(viewport.k).toBeLessThan(focusViewportForNode(node, size).k);
    expect(viewport.y).toBeGreaterThanOrEqual(0);
    expect(viewport.y + node.height * viewport.k + 316).toBeLessThanOrEqual(size.height - 76);
});
