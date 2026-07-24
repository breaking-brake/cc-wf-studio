/**
 * Canvas image capture.
 *
 * Renders the React Flow viewport layer (nodes + edges only — toolbar,
 * minimap, and panels live outside `.react-flow__viewport`) to a PNG data
 * URL covering the entire graph, including parts scrolled out of view.
 *
 * Bounds are computed from the store's own node data via the auto-layout
 * helpers instead of React Flow instance APIs, so the capture works from
 * anywhere (the Toolbar renders outside the ReactFlowProvider).
 */

import { toPng } from 'html-to-image';
import type { Node } from 'reactflow';
import { absoluteNodePosition, nodeBoxSize } from './auto-layout';

/** Whitespace kept around the graph in the exported image (canvas px). */
const PADDING = 48;

/** Cap on the exported image's CSS dimensions; huge graphs are scaled down
 *  to fit. The bitmap is still rendered at 2x this size via pixelRatio. */
const MAX_DIMENSION = 4096;

/** Fallback when the host exposes no --vscode-editor-background (e.g. a
 *  plain browser running `ccwf canvas` without the VSCode theme vars). */
const FALLBACK_BACKGROUND = '#1e1e1e';

/**
 * Capture the current canvas as a PNG data URL.
 *
 * @param nodes - The store's nodes (group children carry group-relative
 *   positions; absolute positions are resolved here).
 * @throws when the canvas is empty or the viewport element is missing.
 */
export async function captureCanvasPng(nodes: Node[]): Promise<string> {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport || nodes.length === 0) {
    throw new Error('Nothing to capture: the canvas is empty.');
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    const { x, y } = absoluteNodePosition(node, nodes);
    const { width, height } = nodeBoxSize(node);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  const width = Math.ceil(maxX - minX) + PADDING * 2;
  const height = Math.ceil(maxY - minY) + PADDING * 2;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const imageWidth = Math.round(width * scale);
  const imageHeight = Math.round(height * scale);

  const themeBackground = getComputedStyle(document.documentElement)
    .getPropertyValue('--vscode-editor-background')
    .trim();

  return toPng(viewport, {
    backgroundColor: themeBackground || FALLBACK_BACKGROUND,
    width: imageWidth,
    height: imageHeight,
    pixelRatio: 2,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      // Content point (minX - PADDING, minY - PADDING) must land at the
      // image origin after `translate(tx, ty) scale(s)` (p → s·p + t).
      transform: `translate(${(PADDING - minX) * scale}px, ${(PADDING - minY) * scale}px) scale(${scale})`,
    },
  });
}
