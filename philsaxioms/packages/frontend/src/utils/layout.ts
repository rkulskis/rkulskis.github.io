import { Node } from '@philsaxioms/shared';

// Type guards for checking node types
const isAxiom = (node: Node): boolean => node.edges.length === 0;
const isArgument = (node: Node): boolean => node.edges.length > 0;

export interface LayoutNode {
  id: string;
  type: 'axiom' | 'argument';
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculateLevelsBFS(nodes: Node[]): Map<string, number> {
  const levels = new Map<string, number>();
  
  // Level 0: All axioms
  for (const node of nodes) {
    if (isAxiom(node)) {
      levels.set(node.id, 0);
    }
  }
  
  // Calculate levels for arguments based on their dependencies
  let changed = true;
  while (changed) {
    changed = false;
    
    for (const node of nodes) {
      if (isArgument(node) && !levels.has(node.id)) {
        // Check if all dependencies have levels assigned
        let maxDependencyLevel = -1;
        let allDependenciesResolved = true;
        
        for (const edge of node.edges) {
          // Edges represent dependencies (what this node builds upon)
          const dependencyLevel = levels.get(edge.to);
          if (dependencyLevel === undefined) {
            allDependenciesResolved = false;
            break;
          }
          maxDependencyLevel = Math.max(maxDependencyLevel, dependencyLevel);
        }
        
        // If all dependencies are resolved, assign level
        if (allDependenciesResolved) {
          const newLevel = maxDependencyLevel + 1;
          levels.set(node.id, newLevel);
          changed = true;
        }
      }
    }
  }
  
  // Ensure all arguments have a level (in case some have no dependencies or circular deps)
  for (const node of nodes) {
    if (isArgument(node) && !levels.has(node.id)) {
      levels.set(node.id, 1); // Default to level 1 for disconnected arguments
    }
  }
  
  return levels;
}

export function calculateHierarchicalLayout(nodes: Node[]): Map<string, LayoutNode> {
  const layout = new Map<string, LayoutNode>();
  
  console.log('DEBUG layout: input nodes:', nodes.length);
  console.log('DEBUG layout: nodes sample:', nodes.slice(0, 2));
  
  // Constants for layout - maximized spacing for clear arrow visibility
  const LEVEL_HEIGHT = 500;
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 150;
  const HORIZONTAL_SPACING = 150;
  const VERTICAL_OFFSET = 200;

  // Calculate levels using BFS
  const nodeLevels = calculateLevelsBFS(nodes);
  console.log('DEBUG layout: nodeLevels:', Object.fromEntries(nodeLevels));
  const levelValues = Array.from(nodeLevels.values());
  const maxLevel = levelValues.length > 0 ? Math.max(...levelValues) : 0;
  console.log('DEBUG layout: maxLevel:', maxLevel);
  
  // Group nodes by level
  const nodesByLevel = new Map<number, Array<{id: string, type: 'axiom' | 'argument', item: Node}>>();
  
  // Add all nodes by their calculated levels
  for (const node of nodes) {
    const level = nodeLevels.get(node.id) || (isAxiom(node) ? 0 : 1);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push({ id: node.id, type: isAxiom(node) ? 'axiom' : 'argument', item: node });
  }

  // Calculate positions for each level
  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const totalWidth = nodesAtLevel.length * NODE_WIDTH + (nodesAtLevel.length - 1) * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2;

    nodesAtLevel.forEach((node, index) => {
      const x = startX + index * (NODE_WIDTH + HORIZONTAL_SPACING);
      const y = VERTICAL_OFFSET + (maxLevel - level) * LEVEL_HEIGHT; // Top-down: higher levels at top

      layout.set(node.id, {
        id: node.id,
        type: node.type,
        level,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      });
    });
  }

  console.log('DEBUG layout: final layout size:', layout.size);
  console.log('DEBUG layout: layout sample:', layout.get('1'));
  return layout;
}

export function calculateOrthogonalEdgePath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceHandle: 'top' | 'bottom' | 'left' | 'right' = 'top',
  targetHandle: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
): string {
  // Calculate control points for orthogonal routing
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  
  let sourceOffset = { x: 0, y: 0 };
  let targetOffset = { x: 0, y: 0 };
  
  // Calculate handle offsets
  switch (sourceHandle) {
    case 'top': sourceOffset = { x: 0, y: -10 }; break;
    case 'bottom': sourceOffset = { x: 0, y: 10 }; break;
    case 'left': sourceOffset = { x: -10, y: 0 }; break;
    case 'right': sourceOffset = { x: 10, y: 0 }; break;
  }
  
  switch (targetHandle) {
    case 'top': targetOffset = { x: 0, y: -10 }; break;
    case 'bottom': targetOffset = { x: 0, y: 10 }; break;
    case 'left': targetOffset = { x: -10, y: 0 }; break;
    case 'right': targetOffset = { x: 10, y: 0 }; break;
  }

  const start = {
    x: sourcePos.x + sourceOffset.x,
    y: sourcePos.y + sourceOffset.y
  };
  
  const end = {
    x: targetPos.x + targetOffset.x,
    y: targetPos.y + targetOffset.y
  };

  // For hierarchical layout, use clear upward routing (top of source to bottom of target)
  if (sourceHandle === 'top' && targetHandle === 'bottom') {
    const midY = start.y + (end.y - start.y) * 0.3;
    const offsetX = Math.abs(end.x - start.x) > 50 ? 0 : (end.x > start.x ? 30 : -30);
    return `M ${start.x} ${start.y} L ${start.x + offsetX} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  }
  
  // For horizontal connections, use orthogonal routing
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = start.x + dx / 2;
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  } else {
    const midY = start.y + dy / 2;
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  }
}