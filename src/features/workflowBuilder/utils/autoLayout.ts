import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 100;
const NODE_HEIGHT = 120;

export function getLayoutedNodes<T extends Record<string, unknown> = Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR',
): Node<T>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}
