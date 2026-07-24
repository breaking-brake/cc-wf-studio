/**
 * Auto Layout — one-click tidy for the workflow canvas.
 *
 * Computes a left-to-right layered layout (dagre) for the whole graph in
 * two passes:
 *   1. each group's children are laid out with the edges internal to that
 *      group, and the group is resized to the children's bounding box
 *   2. the top level is laid out with groups as fixed-size boxes; edges
 *      whose endpoints sit inside groups are lifted to the group itself
 *
 * Groups never nest (one parent hop), and edges never connect group nodes
 * directly, so the two passes cover every case.
 */

import { Graph, layout } from '@dagrejs/dagre';
import type { Edge, Node } from 'reactflow';

/** Gap between nodes in the same rank / between ranks (canvas pixels). */
const NODE_SEPARATION = 48;
const RANK_SEPARATION = 96;

/** Space kept between a group's border and its children. The top edge is
 *  larger to clear the group's header label. */
export const GROUP_PADDING = { top: 56, right: 28, bottom: 28, left: 28 };

/** Matches the GroupNode NodeResizer minimums so an auto-sized group is
 *  never smaller than one a user could resize by hand. */
const GROUP_MIN_WIDTH = 200;
const GROUP_MIN_HEIGHT = 150;

/** Absolute canvas position of a node (groups never nest — one parent hop). */
export function absoluteNodePosition(node: Node, allNodes: Node[]): { x: number; y: number } {
  if (!node.parentId) return { x: node.position.x, y: node.position.y };
  const parent = allNodes.find((n) => n.id === node.parentId);
  return parent
    ? { x: node.position.x + parent.position.x, y: node.position.y + parent.position.y }
    : { x: node.position.x, y: node.position.y };
}

/** Rendered node size: explicit style size (groups) over React Flow's
 *  measured size, with fallbacks for nodes not yet measured. */
export function nodeBoxSize(node: Node): { width: number; height: number } {
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    width: styleWidth ?? node.width ?? (node.type === 'group' ? 400 : 200),
    height: styleHeight ?? node.height ?? (node.type === 'group' ? 300 : 80),
  };
}

export interface AutoLayoutResult {
  /** New position per node id — group-relative for group children. */
  positions: Map<string, { x: number; y: number }>;
  /** New size per group id (groups are resized to fit their children). */
  groupSizes: Map<string, { width: number; height: number }>;
}

interface LayoutItem {
  id: string;
  width: number;
  height: number;
}

/**
 * Run dagre on one flat subgraph and return top-left positions normalized
 * so the layout's bounding box starts at (0, 0).
 */
function layoutSubgraph(
  items: LayoutItem[],
  edges: Array<{ source: string; target: string }>
): Map<string, { x: number; y: number }> {
  const graph = new Graph();
  graph.setGraph({
    rankdir: 'LR',
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const item of items) {
    graph.setNode(item.id, { width: item.width, height: item.height });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }
  layout(graph);

  // Dagre reports node centers; convert to React Flow's top-left origin
  const positions = new Map<string, { x: number; y: number }>();
  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const placed = graph.node(item.id);
    const left = placed.x - item.width / 2;
    const top = placed.y - item.height / 2;
    positions.set(item.id, { x: left, y: top });
    if (left < minLeft) minLeft = left;
    if (top < minTop) minTop = top;
  }
  for (const [id, position] of positions) {
    positions.set(id, { x: position.x - minLeft, y: position.y - minTop });
  }
  return positions;
}

/**
 * Compute a tidy layered layout for the whole canvas. Returns null when
 * there is nothing to lay out (fewer than two nodes).
 *
 * Positions snap to the canvas grid (multiples of `snapGrid`) so laid-out
 * nodes behave exactly like hand-placed ones on the next drag.
 */
export function computeAutoLayout(
  nodes: Node[],
  edges: Edge[],
  snapGrid = 15
): AutoLayoutResult | null {
  if (nodes.length < 2) return null;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const positions = new Map<string, { x: number; y: number }>();
  const groupSizes = new Map<string, { width: number; height: number }>();

  // Pass 1 — lay out each group's children and derive the group's new size
  const groups = nodes.filter((node) => node.type === 'group');
  for (const group of groups) {
    const children = nodes.filter((node) => node.parentId === group.id);
    if (children.length === 0) {
      groupSizes.set(group.id, nodeBoxSize(group));
      continue;
    }
    const internalEdges = edges.filter(
      (edge) =>
        nodeById.get(edge.source)?.parentId === group.id &&
        nodeById.get(edge.target)?.parentId === group.id
    );
    const childPositions = layoutSubgraph(
      children.map((child) => ({ id: child.id, ...nodeBoxSize(child) })),
      internalEdges
    );
    let maxRight = 0;
    let maxBottom = 0;
    for (const child of children) {
      const placed = childPositions.get(child.id);
      if (!placed) continue;
      const size = nodeBoxSize(child);
      const x = snapTo(GROUP_PADDING.left + placed.x, snapGrid);
      const y = snapTo(GROUP_PADDING.top + placed.y, snapGrid);
      positions.set(child.id, { x, y });
      if (x + size.width > maxRight) maxRight = x + size.width;
      if (y + size.height > maxBottom) maxBottom = y + size.height;
    }
    groupSizes.set(group.id, {
      width: Math.max(GROUP_MIN_WIDTH, Math.ceil(maxRight + GROUP_PADDING.right)),
      height: Math.max(GROUP_MIN_HEIGHT, Math.ceil(maxBottom + GROUP_PADDING.bottom)),
    });
  }

  // Pass 2 — lay out the top level with groups as fixed-size boxes.
  // Edges into / out of group children are lifted to the group itself.
  const topLevel = nodes.filter((node) => !node.parentId);
  const liftToTopLevel = (id: string): string | undefined => {
    const node = nodeById.get(id);
    if (!node) return undefined;
    return node.parentId ?? node.id;
  };
  const seenTopEdges = new Set<string>();
  const topEdges: Array<{ source: string; target: string }> = [];
  for (const edge of edges) {
    const source = liftToTopLevel(edge.source);
    const target = liftToTopLevel(edge.target);
    if (!source || !target || source === target) continue;
    const key = `${source}->${target}`;
    if (seenTopEdges.has(key)) continue;
    seenTopEdges.add(key);
    topEdges.push({ source, target });
  }
  const topPositions = layoutSubgraph(
    topLevel.map((node) => ({
      id: node.id,
      ...(node.type === 'group'
        ? (groupSizes.get(node.id) ?? nodeBoxSize(node))
        : nodeBoxSize(node)),
    })),
    topEdges
  );

  // Anchor the new layout at the old drawing's top-left corner so the graph
  // doesn't teleport across the canvas (the caller re-fits the view anyway)
  let anchorX = Number.POSITIVE_INFINITY;
  let anchorY = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const absolute = absoluteNodePosition(node, nodes);
    if (absolute.x < anchorX) anchorX = absolute.x;
    if (absolute.y < anchorY) anchorY = absolute.y;
  }
  if (!Number.isFinite(anchorX)) anchorX = 100;
  if (!Number.isFinite(anchorY)) anchorY = 100;
  anchorX = snapTo(anchorX, snapGrid);
  anchorY = snapTo(anchorY, snapGrid);

  for (const node of topLevel) {
    const placed = topPositions.get(node.id);
    if (!placed) continue;
    positions.set(node.id, {
      x: snapTo(anchorX + placed.x, snapGrid),
      y: snapTo(anchorY + placed.y, snapGrid),
    });
  }

  return { positions, groupSizes };
}

function snapTo(value: number, grid: number): number {
  return grid > 0 ? Math.round(value / grid) * grid : Math.round(value);
}
