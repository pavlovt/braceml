import type { Node, Template } from './ast.js';

/** Depth-first visit of every node. Return `false` from the visitor to skip a node's children. */
export function walk(root: Template | Node[], visit: (node: Node) => void | false): void {
  const nodes = Array.isArray(root) ? root : root.children;
  for (const node of nodes) {
    if (visit(node) === false) continue;
    for (const list of childLists(node)) walk(list, visit);
  }
}

function childLists(node: Node): Node[][] {
  switch (node.type) {
    case 'Element':
      return node.children ? [node.children] : [];
    case 'If':
      return node.branches.map((b) => b.children);
    case 'Each':
      return node.fallback ? [node.children, node.fallback] : [node.children];
    case 'Await':
      return [node.pending, node.then, node.catch].filter((x): x is Node[] => x !== null);
    case 'Key':
    case 'Snippet':
      return [node.children];
    default:
      return [];
  }
}
