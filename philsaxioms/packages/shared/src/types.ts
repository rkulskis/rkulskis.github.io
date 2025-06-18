export interface AxiomCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface NodeEdge {
  to: string; // ID of the target node
  description: string;
}

export interface Node {
  id: string;
  title: string;
  description: string;
  category: string;
  edges: NodeEdge[];
  conclusion?: string; // Only present for arguments (nodes with edges)
  position?: {
    x: number;
    y: number;
  };
}

// Type guards for checking node types
export const isAxiom = (node: Node): boolean => node.edges.length === 0;
export const isArgument = (node: Node): boolean => node.edges.length > 0;

// Legacy type aliases for compatibility
export type Axiom = Node;
export type Argument = Node;

export interface UserSession {
  id: string;
  acceptedAxioms: string[];
  rejectedAxioms: string[];
  exploredConnections?: string[];
  currentSnapshot?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Snapshot {
  id: string;
  title: string;
  description?: string;
  axioms: string[];
  edges: string[];
  userPositions?: Record<string, { x: number; y: number }>;
  metadata?: {
    createdBy?: string;
    isPublic?: boolean;
    tags?: string[];
  };
  createdAt: Date;
}

export interface Source {
  id: string;
  name: string;
  period?: string;
  tradition?: string;
  key_works?: string[];
  perspective?: string;
  description?: string;
  key_figures?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  orphanedArguments: string[];
  circularDependencies: string[];
}


export interface GraphData {
  nodes: Node[];
  categories: AxiomCategory[];
}

export interface QuestionnaireItem {
  id: string;
  text: string;
  description?: string;
  axiomId: string;
  category: string;
}