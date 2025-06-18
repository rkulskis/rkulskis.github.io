import { useCallback, useMemo, useState, useEffect, memo } from 'react';
import ReactFlow, {
  Node as FlowNode,
  Edge as FlowEdge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Eye, EyeOff, Home, Edit } from 'lucide-react';
import { Node, Axiom, Argument, AxiomCategory, UserSession } from '@philsaxioms/shared';

// Type guards for checking node types
const isAxiom = (node: Node): boolean => node.edges.length === 0;
import { ArgumentValidator } from '../utils/argument-validator';
import PhilNode from './Node';
import PhilEdge from './Edge';
import { calculateHierarchicalLayout } from '../utils/layout';
import { apiClient } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

const isLocalDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');

const nodeTypes = {
  axiom: PhilNode,
  argument: PhilNode,
};

const edgeTypes = {
  custom: PhilEdge,
};

interface GraphViewProps {
  nodes: Node[];
  categories: AxiomCategory[];
  session: UserSession;
  onSessionUpdate: (updates: Partial<UserSession>) => void;
}

const GraphViewInner = memo(function GraphViewInner({ nodes, categories, session, onSessionUpdate }: GraphViewProps) {
  const [selectedNode, setSelectedNode] = useState<{node: Node, type: 'axiom' | 'argument'} | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showInvalidNodes, setShowInvalidNodes] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [selectedElements, setSelectedElements] = useState<{nodes: FlowNode[], edges: FlowEdge[]}>({nodes: [], edges: []});
  const [nodeFormData, setNodeFormData] = useState({
    id: '',
    type: 'axiom' as 'axiom' | 'argument',
    title: '',
    description: '',
    conclusion: '',
    category: 'metaphysics',
    edges: [] as { to: string; description: string }[],
    position: { x: 0, y: 0 }
  });

  // Generate next available numeric ID
  const getNextId = (): string => {
    const existingIds = nodes.map(n => parseInt(n.id)).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return (maxId + 1).toString();
  };
  const navigate = useNavigate();

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  // const axioms = nodes.filter(node => node.type === 'axiom') as Axiom[];
  // const argumentNodes = nodes.filter(node => node.type === 'argument') as Argument[];

  // Function to find arguments that build upon this node (have edges pointing to this node)
  const getArgumentsBuiltUponThis = (nodeId: string): Array<{node: Node, type: 'axiom' | 'argument'}> => {
    const dependents: Array<{node: Node, type: 'axiom' | 'argument'}> = [];
    
    // Find nodes that have edges pointing to this nodeId (meaning they build upon this node)
    for (const node of nodes) {
      for (const edge of node.edges) {
        if (edge.to === nodeId) {
          dependents.push({ node, type: isAxiom(node) ? 'axiom' : 'argument' });
        }
      }
    }
    
    return dependents;
  };

  // Function to find all dependency axioms for a node (recursive search)
  const getDependencyAxioms = (nodeId: string, visited = new Set<string>()): Axiom[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    
    const dependencyAxioms = new Set<Axiom>();
    
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return [];
    
    // If this is an axiom, return it
    if (isAxiom(currentNode)) {
      dependencyAxioms.add(currentNode as Axiom);
      return Array.from(dependencyAxioms);
    }
    
    // For arguments, find all dependency nodes recursively
    for (const edge of currentNode.edges) {
      // Edges mean this node builds upon the target
      const childAxioms = getDependencyAxioms(edge.to, visited);
      childAxioms.forEach(ax => dependencyAxioms.add(ax));
    }
    
    return Array.from(dependencyAxioms);
  };

  // Debounce session changes to reduce expensive calculations
  const debouncedSession = useDebounce(session, 100);
  
  // Calculate which arguments are valid based on accepted axioms using edge relationships
  const validArguments = useMemo(() => {
    const validator = new ArgumentValidator();
    const acceptedAxioms = new Set(debouncedSession.acceptedAxioms);
    return validator.calculateValidArguments(nodes, acceptedAxioms);
  }, [nodes, debouncedSession.acceptedAxioms]);

  // Calculate hierarchical layout with more stable dependencies
  const layout = useMemo(() => {
    return calculateHierarchicalLayout(nodes);
  }, [nodes.length]);

  const initialNodes: FlowNode[] = useMemo(() => {
    const flowNodes: FlowNode[] = [];
    
    console.log('DEBUG initialNodes: input nodes length:', nodes.length);
    console.log('DEBUG initialNodes: first node:', nodes[0]);
    console.log('DEBUG initialNodes: layout size:', layout.size);
    console.log('DEBUG initialNodes: validArguments:', validArguments);
    console.log('DEBUG initialNodes: session:', debouncedSession);
    
    // Process all nodes
    nodes.forEach(node => {
      const category = getCategoryById(node.category);
      const layoutNode = layout.get(node.id);
      
      if (isAxiom(node)) {
        const isAccepted = debouncedSession.acceptedAxioms.includes(node.id);
        const isRejected = debouncedSession.rejectedAxioms.includes(node.id);
        
        // Never hide axioms - they are the foundation of the graph
        // We'll use visual styling to indicate their status instead
        
        flowNodes.push({
          id: node.id,
          type: 'axiom',
          position: layoutNode ? { x: layoutNode.x, y: layoutNode.y } : { x: 0, y: 0 },
          data: {
            type: 'axiom' as const,
            node: node,
            category: category || { id: 'unknown', name: 'Unknown', color: '#gray' },
            isSelected: selectedNode?.node.id === node.id,
            isAccepted,
            isRejected,
            onSelect: (axiom: Axiom) => setSelectedNode({ node: axiom, type: 'axiom' }),
            showHandles: showEditPanel && isLocalDevelopment,
          },
        });
      } else {
        const isValid = validArguments.has(node.id);
        
        // Only filter out arguments if showInvalidNodes is false AND the argument is invalid
        if (!showInvalidNodes && !isValid) {
          return;
        }
        
        flowNodes.push({
          id: node.id,
          type: 'argument',
          position: layoutNode ? { x: layoutNode.x, y: layoutNode.y } : { x: 0, y: 0 },
          data: {
            type: 'argument' as const,
            node: node,
            category: category || { id: 'unknown', name: 'Unknown', color: '#gray' },
            isSelected: selectedNode?.node.id === node.id,
            isValid,
            onSelect: (argument: Argument) => setSelectedNode({ node: argument, type: 'argument' }),
            showHandles: showEditPanel && isLocalDevelopment,
          },
        });
      }
    });
    
    console.log('DEBUG initialNodes: final flowNodes length:', flowNodes.length);
    console.log('DEBUG initialNodes: flowNodes sample:', flowNodes[0]);
    return flowNodes;
  }, [nodes, categories, debouncedSession, selectedNode, layout, validArguments, showInvalidNodes]);

  const initialEdges: FlowEdge[] = useMemo(() => {
    const flowEdges: FlowEdge[] = [];
    let edgeCounter = 0;

    // Create edges from the embedded edge data in nodes
    nodes.forEach(sourceNode => {
      sourceNode.edges.forEach(edge => {
        const sourceVisible = initialNodes.some(node => node.id === sourceNode.id);
        const targetVisible = initialNodes.some(node => node.id === edge.to);
        
        if (sourceVisible && targetVisible) {
          flowEdges.push({
            id: `${sourceNode.id}-${edge.to}-${edgeCounter++}`,
            source: sourceNode.id,
            target: edge.to,
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'custom',
            data: {
              relation: { type: 'supports' },
              label: 'supports',
              edgeIndex: 0,
              totalEdges: 1,
              description: edge.description,
            },
            animated: false,
          });
        }
      });
    });

    return flowEdges;
  }, [nodes, initialNodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle selection changes
  const onSelectionChange = useCallback((elements: {nodes: FlowNode[], edges: FlowEdge[]}) => {
    setSelectedElements(elements);
    console.log('Selection changed:', elements); // Debug log
  }, []);

  // Handle pane clicks for creating nodes
  const onPaneClick = useCallback((event: React.MouseEvent<Element, MouseEvent>) => {
    if (!showEditPanel || !isLocalDevelopment) return;
    
    // Get the click position relative to the flow
    const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;
    
    const position = {
      x: event.clientX - reactFlowBounds.left - 140, // Offset for node width
      y: event.clientY - reactFlowBounds.top - 75   // Offset for node height
    };
    
    // Set up node form data with position
    setNodeFormData({
      id: getNextId(),
      type: 'axiom',
      title: '',
      description: '',
      conclusion: '',
      category: 'metaphysics',
      edges: [],
      position // Add position to form data
    });
    setShowNodeForm(true);
  }, [showEditPanel, getNextId]);

  // Handle keyboard events for deletion and ESC
  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    // ESC key to close modals
    if (event.key === 'Escape') {
      event.preventDefault();
      if (showNodeForm) {
        setShowNodeForm(false);
        return;
      }
      if (showSnapshotModal) {
        setShowSnapshotModal(false);
        return;
      }
    }
    
    if (!showEditPanel || !isLocalDevelopment) return;
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      console.log('Delete key pressed, selected elements:', selectedElements);
      
      // Delete selected nodes
      if (selectedElements.nodes.length > 0) {
        const nodeToDelete = selectedElements.nodes[0];
        const nodeData = nodes.find(n => n.id === nodeToDelete.id);
        console.log('Attempting to delete node:', nodeData);
        
        if (nodeData && confirm(`Are you sure you want to delete ${isAxiom(nodeData) ? 'axiom' : 'argument'} #${nodeData.id}: "${nodeData.title}"?`)) {
          try {
            await apiClient.deleteNode(nodeData.id);
            window.location.reload();
          } catch (error) {
            console.error('Failed to delete node:', error);
            alert('Failed to delete node: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        }
      }
      // Delete selected edges
      else if (selectedElements.edges.length > 0) {
        const edgeToDelete = selectedElements.edges[0];
        const sourceNode = nodes.find(n => n.id === edgeToDelete.source);
        const targetNode = nodes.find(n => n.id === edgeToDelete.target);
        console.log('Attempting to delete edge:', edgeToDelete, sourceNode, targetNode);
        
        if (sourceNode && targetNode && confirm(`Are you sure you want to delete the edge from "${sourceNode.title}" to "${targetNode.title}"?`)) {
          try {
            // Remove the edge from the source node
            const updatedNode = {
              ...sourceNode,
              edges: sourceNode.edges.filter(edge => edge.to !== edgeToDelete.target)
            };
            
            // Delete and recreate the node with updated edges
            await apiClient.deleteNode(sourceNode.id);
            await apiClient.createNode(updatedNode);
            window.location.reload();
          } catch (error) {
            console.error('Failed to delete edge:', error);
            alert('Failed to delete edge: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        }
      } else {
        console.log('No elements selected for deletion');
      }
    }
  }, [selectedElements, showEditPanel, nodes, showNodeForm, showSnapshotModal]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAxiomToggle = (axiom: Axiom, accept: boolean) => {
    const updates: Partial<UserSession> = {};
    
    if (accept) {
      updates.acceptedAxioms = [...session.acceptedAxioms.filter(id => id !== axiom.id), axiom.id];
      updates.rejectedAxioms = session.rejectedAxioms.filter(id => id !== axiom.id);
    } else {
      updates.rejectedAxioms = [...session.rejectedAxioms.filter(id => id !== axiom.id), axiom.id];
      updates.acceptedAxioms = session.acceptedAxioms.filter(id => id !== axiom.id);
    }
    
    onSessionUpdate(updates);
  };

  // Update nodes when session changes
  useEffect(() => {
    setFlowNodes(initialNodes);
  }, [initialNodes, setFlowNodes]);

  // Update edges when nodes change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleCreateSnapshot = async () => {
    try {
      const snapshot = await apiClient.createSnapshot(session.id, snapshotTitle, snapshotDescription, isPublic);
      console.log('Snapshot created:', snapshot);
      setShowSnapshotModal(false);
      setSnapshotTitle('');
      setSnapshotDescription('');
      setIsPublic(false);
      
      // Copy link to clipboard
      const url = `${window.location.origin}/snapshot/${snapshot.id}`;
      navigator.clipboard.writeText(url);
      alert(`Snapshot created! Link copied to clipboard: ${url}`);
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      alert('Failed to create snapshot');
    }
  };

  return (
    <div className={`h-screen w-full transition-colors duration-200 ${
      showEditPanel && isLocalDevelopment ? 'bg-purple-50' : 'bg-gray-50'
    }`}>
      <ReactFlow
        nodes={flowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={isLocalDevelopment && showEditPanel}
        nodesConnectable={isLocalDevelopment && showEditPanel}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        multiSelectionKeyCode="Meta"
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-lg" />
        <MiniMap 
          className="bg-white border border-gray-200 rounded-lg shadow-lg"
          nodeColor={(node) => {
            // Get category from node data
            const category = node.data.category;
            return category?.color || '#6B7280';
          }}
        />
      </ReactFlow>

      {/* Sidebar */}
      {selectedNode && (
        <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-6 z-10">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  selectedNode.type === 'axiom' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {selectedNode.type === 'axiom' ? 'Axiom' : 'Argument'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedNode.node.title}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {selectedNode.node.description}
              </p>
              
              {selectedNode.type === 'argument' && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    Conclusion: {(selectedNode.node as Argument).conclusion}
                  </p>
                </div>
              )}
            </div>

            {selectedNode.type === 'axiom' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAxiomToggle(selectedNode.node as Axiom, true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    session.acceptedAxioms.includes(selectedNode.node.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleAxiomToggle(selectedNode.node as Axiom, false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    session.rejectedAxioms.includes(selectedNode.node.id)
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  Reject
                </button>
              </div>
            )}

            {/* Arguments Built Upon This and Required Axioms */}
            <div className="space-y-3">
              {(() => {
                const dependents = getArgumentsBuiltUponThis(selectedNode.node.id);
                const requiredAxioms = getDependencyAxioms(selectedNode.node.id);
                
                return (
                  <>
                    {dependents.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Arguments Built Upon This:
                        </h4>
                        <div className="space-y-1">
                          {dependents.map(dependent => (
                            <div key={dependent.node.id} className="text-sm text-blue-700">
                              • #{dependent.node.id} {dependent.node.title} ({dependent.type})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {requiredAxioms.length > 0 && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <h4 className="text-sm font-medium text-orange-800 mb-2">
                          Required Axioms:
                        </h4>
                        <div className="space-y-1">
                          {requiredAxioms.map(axiom => {
                            const isAccepted = session.acceptedAxioms.includes(axiom.id);
                            const isRejected = session.rejectedAxioms.includes(axiom.id);
                            return (
                              <div 
                                key={axiom.id} 
                                className={`text-sm flex items-center gap-2 ${
                                  isAccepted ? 'text-green-700' : 
                                  isRejected ? 'text-red-700' : 'text-orange-700'
                                }`}
                              >
                                <span>
                                  {isAccepted ? '✅' : isRejected ? '❌' : '❓'}
                                </span>
                                #{axiom.id} {axiom.title}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.type === 'argument' && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          {validArguments.has(selectedNode.node.id) 
                            ? "✅ This argument is valid based on your accepted axioms"
                            : "❌ This argument requires additional axioms to be accepted"
                          }
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between bg-white shadow-lg border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700 transition-colors"
            >
              <Home className="w-3 h-3" />
              New
            </button>
            
            <button
              onClick={() => setShowSnapshotModal(true)}
              className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            
            <button
              onClick={() => setShowInvalidNodes(!showInvalidNodes)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showInvalidNodes 
                  ? 'bg-gray-500 text-white hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showInvalidNodes ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showInvalidNodes ? 'Hide' : 'Show All'}
            </button>
            
            {isLocalDevelopment && (
              <button
                onClick={() => setShowEditPanel(!showEditPanel)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  showEditPanel 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          {/* Compact Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Categories:</span>
              {categories.slice(0, 4).map(category => (
                <div key={category.id} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-gray-500">{category.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-gray-500">Supports</span>
            </div>
          </div>
        </div>
      </div>


      {/* Node Editor Panel */}
      {isLocalDevelopment && showEditPanel && (
        <div className="absolute top-16 right-4 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-6 z-10 max-h-96 overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Node Editor</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create new nodes and connections. Changes are for development only.
          </p>
          
          {/* Selection Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selection Status</h4>
            {selectedElements.nodes.length > 0 && (
              <p className="text-sm text-blue-600">
                📍 Selected: {selectedElements.nodes.length} node(s) - Press DELETE to remove
              </p>
            )}
            {selectedElements.edges.length > 0 && (
              <p className="text-sm text-purple-600">
                ↔️ Selected: {selectedElements.edges.length} edge(s) - Press DELETE to remove
              </p>
            )}
            {selectedElements.nodes.length === 0 && selectedElements.edges.length === 0 && (
              <p className="text-sm text-gray-500">
                ⚪ No selection - Click to select nodes/edges
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Quick Help */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <h4 className="text-sm font-medium text-purple-800 mb-2">Editor Keyboard Shortcuts</h4>
              <div className="space-y-1 text-xs text-purple-700">
                <div>📍 <strong>Click background</strong> - Create node</div>
                <div>🔗 <strong>Drag handles</strong> - Create edge</div>
                <div>🗑️ <strong>Select + DELETE</strong> - Delete item</div>
                <div>📝 <strong>Click node</strong> - View/edit details</div>
                <div>🔒 <strong>ESC</strong> - Close dialogs</div>
              </div>
            </div>
            
            {/* Node List with Edit Options */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Nodes ({nodes.length})</h4>
              <div className="max-h-64 overflow-auto space-y-1 border border-gray-200 rounded-lg p-2">
                {nodes.map(node => {
                  const category = getCategoryById(node.category);
                  return (
                    <div 
                      key={node.id} 
                      className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedNode({ node, type: isAxiom(node) ? 'axiom' : 'argument' })}
                    >
                      <span className="flex items-center gap-2 flex-1">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category?.color || '#gray' }}
                        />
                        <span className="text-xs font-medium text-gray-700">#{node.id}</span>
                        <span className="text-xs text-gray-600 truncate">{node.title}</span>
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isAxiom(node) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isAxiom(node) ? 'axiom' : 'argument'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => setShowEditPanel(false)}
              className="w-full text-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Close Editor (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Node Creation Form */}
      {isLocalDevelopment && showNodeForm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">
              Add Node
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Node type will be automatically determined: nodes with incoming support are arguments, nodes without are axioms.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID (Auto-generated)
                  </label>
                  <input
                    type="text"
                    value={`#${nodeFormData.id}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={nodeFormData.category}
                    onChange={(e) => setNodeFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={nodeFormData.title}
                  onChange={(e) => setNodeFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief title for the node"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={nodeFormData.description}
                  onChange={(e) => setNodeFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Detailed explanation..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conclusion (Optional - for arguments only)
                </label>
                <input
                  type="text"
                  value={nodeFormData.conclusion}
                  onChange={(e) => setNodeFormData(prev => ({ ...prev, conclusion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What this argument concludes (leave empty for axioms)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supports (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add node IDs that this node supports (builds upon). Use # format like #1, #2, etc.
                </p>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {nodeFormData.edges.map((edge, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600 px-2">Supports</span>
                      <input
                        type="text"
                        value={edge.to}
                        onChange={(e) => {
                          const newEdges = [...nodeFormData.edges];
                          newEdges[index].to = e.target.value;
                          setNodeFormData(prev => ({ ...prev, edges: newEdges }));
                        }}
                        placeholder="#1"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newEdges = nodeFormData.edges.filter((_, i) => i !== index);
                          setNodeFormData(prev => ({ ...prev, edges: newEdges }));
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNodeFormData(prev => ({
                        ...prev,
                        edges: [...prev.edges, { to: '', description: '' }]
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded hover:bg-gray-50"
                  >
                    + Add Support Connection
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  try {
                    // Auto-detect node type: if it has edges (supports other nodes), it's an argument, otherwise it's an axiom
                    const hasEdges = nodeFormData.edges.some(edge => edge.to && edge.to.trim());
                    const hasConclusion = nodeFormData.conclusion && nodeFormData.conclusion.trim();
                    const isArgument = hasEdges || hasConclusion;
                    
                    let newNode: Node & { position?: { x: number; y: number } };
                    
                    newNode = {
                      id: nodeFormData.id,
                      title: nodeFormData.title,
                      description: nodeFormData.description,
                      category: nodeFormData.category,
                      edges: nodeFormData.edges.filter(edge => edge.to && edge.to.trim()),
                      position: nodeFormData.position
                    } as Node & { position: { x: number; y: number } };
                    
                    // Add conclusion if it's an argument (has edges or explicit conclusion)
                    if (isArgument && nodeFormData.conclusion) {
                      newNode.conclusion = nodeFormData.conclusion;
                    } else if (isArgument && !nodeFormData.conclusion) {
                      newNode.conclusion = 'Auto-generated argument';
                    }

                    // Clean up edge targets (remove # prefix if present)
                    const cleanedNode = {
                      ...newNode,
                      edges: newNode.edges.map(edge => ({
                        ...edge,
                        to: edge.to.startsWith('#') ? edge.to.substring(1) : edge.to
                      }))
                    };

                    await apiClient.createNode(cleanedNode);
                    
                    // Reset form and close modal
                    setNodeFormData({
                      id: '',
                      type: 'axiom',
                      title: '',
                      description: '',
                      conclusion: '',
                      category: 'metaphysics',
                      edges: [],
                      position: { x: 0, y: 0 }
                    });
                    setShowNodeForm(false);
                    
                    // Refresh the page to show the new node
                    window.location.reload();
                  } catch (error) {
                    console.error('Failed to create node:', error);
                    alert('Failed to create node: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                disabled={!nodeFormData.id || !nodeFormData.title || !nodeFormData.description}
                className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Node
              </button>
              <button
                onClick={() => setShowNodeForm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Snapshot</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={snapshotTitle}
                  onChange={(e) => setSnapshotTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Philosophical Framework"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={snapshotDescription}
                  onChange={(e) => setSnapshotDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe your philosophical viewpoint..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="public" className="text-sm text-gray-700">
                  Make this snapshot public
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateSnapshot}
                disabled={!snapshotTitle.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Snapshot
              </button>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
