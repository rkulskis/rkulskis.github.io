import { EdgeProps, getStraightPath, getBezierPath } from 'reactflow';

interface EdgeRelation {
  type: 'supports';
}

interface EdgeData {
  relation: EdgeRelation;
  label: string;
  edgeIndex?: number; // Index for multiple edges between same nodes
  totalEdges?: number; // Total number of edges between same nodes
  description?: string;
}

const getEdgeStyle = (relation: EdgeRelation) => {
  const baseStyle = {
    strokeWidth: 2,
  };

  switch (relation.type) {
    case 'supports':
      return { ...baseStyle, stroke: '#3B82F6' };
    default:
      return { ...baseStyle, stroke: '#6B7280' };
  }
};

const calculateSpacedPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  edgeIndex: number = 0,
  totalEdges: number = 1
) => {
  // If only one edge, use straight path
  if (totalEdges === 1) {
    return getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  }

  // Calculate spacing for multiple edges
  const spacing = 30; // Base spacing between parallel edges
  const maxOffset = (totalEdges - 1) * spacing / 2;
  const offset = (edgeIndex * spacing) - maxOffset;

  // Calculate perpendicular offset direction
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return getStraightPath({ sourceX, sourceY, targetX, targetY });
  }

  // Perpendicular vector for spacing
  const perpX = -dy / length * offset;
  const perpY = dx / length * offset;

  // Use bezier curve for spaced edges

  return getBezierPath({
    sourceX: sourceX + perpX * 0.3,
    sourceY: sourceY + perpY * 0.3,
    sourcePosition: 'bottom' as any,
    targetX: targetX + perpX * 0.3,
    targetY: targetY + perpY * 0.3,
    targetPosition: 'top' as any,
    curvature: 0.2 + (Math.abs(offset) / 100),
  });
};

export default function Edge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<EdgeData>) {
  const style = data?.relation ? getEdgeStyle(data.relation) : { stroke: '#6B7280', strokeWidth: 1 };
  
  // Calculate path with spacing for multiple edges
  const [edgePath] = calculateSpacedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    data?.edgeIndex || 0,
    data?.totalEdges || 1
  );

  return (
    <g>
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 20 20"
          refX="18"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,20 L20,10 z"
            fill={style.stroke}
            stroke={style.stroke}
            strokeWidth="1"
          />
        </marker>
      </defs>
      
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#arrow-${id})`}
        fill="none"
      />
    </g>
  );
}

// Export type for use in other components
export type { EdgeData };