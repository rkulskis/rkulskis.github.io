import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { Axiom, Argument, AxiomCategory } from '@philsaxioms/shared';
import clsx from 'clsx';
import { ChevronRight, Target } from 'lucide-react';
import { nodeAnimations, cardAnimations } from '../utils/animations';

// Base node data interface
interface BaseNodeData {
  category: AxiomCategory;
  isSelected: boolean;
  showHandles?: boolean;
}

// Axiom-specific data
interface AxiomNodeData extends BaseNodeData {
  type: 'axiom';
  node: Axiom;
  isAccepted: boolean;
  isRejected: boolean;
  onSelect: (axiom: Axiom) => void;
}

// Argument-specific data
interface ArgumentNodeData extends BaseNodeData {
  type: 'argument';
  node: Argument;
  isValid: boolean;
  onSelect: (argument: Argument) => void;
}

type NodeData = AxiomNodeData | ArgumentNodeData;

interface NodeProps {
  data: NodeData;
  showHandles?: boolean;
}

// Node status utilities
const getNodeStatus = (data: NodeData) => {
  if (data.type === 'axiom') {
    if (data.isAccepted) return 'accepted';
    if (data.isRejected) return 'rejected';
    return 'neutral';
  } else {
    return data.isValid ? 'valid' : 'invalid';
  }
};

const getNodeColors = (data: NodeData, status: string) => {
  const isSelected = data.isSelected;
  
  if (data.type === 'axiom') {
    if (isSelected) {
      return 'border-purple-600 bg-purple-50 border-4 shadow-xl';
    }
    switch (status) {
      case 'accepted': return 'border-blue-500 bg-blue-50 border-4';
      case 'rejected': return 'border-red-400 bg-red-50 border-2 opacity-60';
      default: return 'border-gray-300 border-2';
    }
  } else {
    if (isSelected) {
      return 'border-purple-600 bg-purple-50 border-4 shadow-xl';
    }
    return status === 'valid' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50';
  }
};


// Level badge color function (removed in new format)
// const getLevelBadgeColor = (level?: number): string => {
//   switch (level) {
//     case 1: return 'bg-blue-500';
//     case 2: return 'bg-purple-500';
//     case 3: return 'bg-orange-500';
//     case 4: return 'bg-red-500';
//     default: return 'bg-gray-500';
//   }
// };

// Status indicator component
const StatusIndicator = ({ data, status }: { data: NodeData; status: string }) => {
  if (data.type === 'axiom') {
    if (status === 'accepted') {
      return <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full"></div>;
    }
    if (status === 'rejected') {
      return <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full"></div>;
    }
  } else {
    return (
      <div className="absolute top-2 left-2 flex items-center gap-1">
        <Target 
          className={clsx(
            "w-3 h-3",
            status === 'valid' ? "text-green-500" : "text-gray-400"
          )} 
        />
      </div>
    );
  }
  return null;
};

// Level badge component for arguments (removed in new format)
// const LevelBadge = ({ level }: { level?: number }) => {
//   if (level === undefined) return null;
//   
//   return (
//     <div 
//       className={clsx(
//         "absolute -top-2 -left-2 px-2 py-1 rounded-full text-xs font-bold text-white",
//         getLevelBadgeColor(level)
//       )}
//     >
//       L{level}
//     </div>
//   );
// };

// Category badge component
const CategoryBadge = ({ category }: { category: AxiomCategory }) => (
  <div 
    className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-medium text-white"
    style={{ backgroundColor: category.color }}
  >
    {category.name}
  </div>
);

// ID badge component
const IdBadge = ({ id }: { id: string }) => (
  <div className="absolute -top-2 -left-2 px-2 py-1 rounded-full text-xs font-bold bg-gray-800 text-white">
    #{id}
  </div>
);

// Lego-style connectors for axioms
const LegoConnectors = ({ category }: { category: AxiomCategory }) => (
  <>
    <motion.div 
      className="lego-connector top" 
      style={{ backgroundColor: category.color }}
      whileHover={{ scale: 1.2, y: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
    />
    <motion.div 
      className="lego-connector bottom" 
      style={{ backgroundColor: category.color }}
      whileHover={{ scale: 1.2, y: 2 }}
      transition={{ type: "spring", stiffness: 400 }}
    />
    <motion.div 
      className="lego-connector left" 
      style={{ backgroundColor: category.color }}
      whileHover={{ scale: 1.2, x: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
    />
    <motion.div 
      className="lego-connector right" 
      style={{ backgroundColor: category.color }}
      whileHover={{ scale: 1.2, x: 2 }}
      transition={{ type: "spring", stiffness: 400 }}
    />
  </>
);

// Argument conclusion component
const ArgumentConclusion = ({ conclusion }: { conclusion: string }) => (
  <div className="border-t border-gray-200 pt-2">
    <div className="flex items-start gap-2">
      <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs font-medium text-blue-700 leading-tight">
        {conclusion}
      </p>
    </div>
  </div>
);

// Strength indicator for arguments (removed in new format)
// const StrengthIndicator = ({ strength }: { strength?: number }) => {
//   if (strength === undefined) return null;
//   
//   return (
//     <div className="flex items-center gap-2">
//       <span className="text-xs text-gray-500">Strength:</span>
//       <div className="flex-1 bg-gray-200 rounded-full h-1">
//         <div 
//           className="bg-green-500 h-1 rounded-full transition-all duration-300"
//           style={{ width: `${strength * 100}%` }}
//         />
//       </div>
//       <span className="text-xs text-gray-500">
//         {Math.round(strength * 100)}%
//       </span>
//     </div>
//   );
// };

// Tags component (removed in new format)
// const Tags = ({ tags, maxTags = 3 }: { tags?: string[]; maxTags?: number }) => {
//   if (!tags?.length) return null;
//   
//   return (
//     <div className="flex flex-wrap gap-1">
//       {tags.slice(0, maxTags).map((tag) => (
//         <span
//           key={tag}
//           className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
//         >
//           {tag}
//         </span>
//       ))}
//     </div>
//   );
// };

export default memo(function Node({ data }: NodeProps) {
  const showHandles = data.showHandles || false;
  const { category, isSelected } = data;
  const status = getNodeStatus(data);
  
  const handleClick = () => {
    if (data.type === 'axiom') {
      data.onSelect(data.node);
    } else {
      data.onSelect(data.node);
    }
  };

  const nodeColors = getNodeColors(data, status);
  const isAxiom = data.type === 'axiom';
  const isArgument = data.type === 'argument';

  return (
    <motion.div
      className={clsx(
        'relative p-4 rounded-lg shadow-lg cursor-pointer transition-all duration-200 border-2',
        nodeColors,
        {
          'axiom-node': isAxiom,
          'min-w-[200px] max-w-[280px]': isAxiom,
          'min-w-[240px] max-w-[320px]': isArgument,
          'transform scale-105': isSelected,
        }
      )}
      style={{
        borderColor: isAxiom && status === 'neutral' ? category.color : undefined,
      }}
      onClick={handleClick}
      whileHover={nodeAnimations.hover}
      whileTap={nodeAnimations.tap}
      variants={cardAnimations}
      initial="hidden"
      animate={isSelected ? nodeAnimations.snap : "visible"}
    >
      {/* React Flow handles for connections */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className={showHandles ? "w-4 h-4 bg-blue-500 border-2 border-white shadow-lg" : "opacity-0"} 
        id="target" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={showHandles ? "w-4 h-4 bg-blue-500 border-2 border-white shadow-lg" : "opacity-0"} 
        id="source" 
      />

      {/* Lego-style connectors for axioms */}
      {isAxiom && <LegoConnectors category={category} />}

      {/* ID badge */}
      <IdBadge id={data.node.id} />

      {/* Category badge */}
      <CategoryBadge category={category} />

      {/* Status indicator */}
      <StatusIndicator data={data} status={status} />

      {/* Content */}
      <div className={clsx("space-y-2", { "mt-4": isArgument })}>
        <h3 className={clsx(
          "font-semibold text-gray-900 leading-tight",
          isArgument ? "text-sm font-bold" : ""
        )}>
          {data.node.title}
        </h3>
        
        <p className={clsx(
          "text-gray-600 leading-relaxed",
          isArgument ? "text-xs" : "text-sm"
        )}>
          {data.node.description}
        </p>

        {/* Argument-specific content */}
        {isArgument && (
          <>
            <ArgumentConclusion conclusion={(data.node as Argument).conclusion || ''} />
            
            {/* Strength indicator removed in new format */}
          </>
        )}

        {/* Tags removed in new format */}
      </div>
    </motion.div>
  );
});

// Export type for use in other components
export type { NodeData, AxiomNodeData, ArgumentNodeData };
