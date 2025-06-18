import { Node, Argument } from '@philsaxioms/shared';

// Type guards for checking node types
const isAxiom = (node: Node): boolean => node.edges.length === 0;
const isArgument = (node: Node): boolean => node.edges.length > 0;

export interface ValidationContext {
  acceptedAxioms: Set<string>;
  validArguments: Set<string>;
  allNodes: Node[];
}

export class ArgumentValidator {
  /**
   * Check if an argument can be activated based on supporting edges
   * With "supports" edges, we need to find what this argument is built upon
   */
  canActivateArgument(
    argument: Argument, 
    context: ValidationContext, 
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(argument.id)) return false; // Prevent circular dependencies
    visited.add(argument.id);
    
    // Find nodes that this argument depends on
    const dependencyNodes = argument.edges
      .map(edge => context.allNodes.find(node => node.id === edge.to))
      .filter(node => node !== undefined);
    
    if (dependencyNodes.length === 0) {
      // No dependencies, consider it valid
      return true;
    }
    
    // Check if all dependency nodes are valid/accepted
    for (const dependencyNode of dependencyNodes) {
      if (isAxiom(dependencyNode!)) {
        // Dependency axiom: check if axiom is accepted
        if (!context.acceptedAxioms.has(dependencyNode!.id)) {
          return false;
        }
      } else {
        // Dependency argument: check if dependency argument is valid (recursive)
        if (!context.validArguments.has(dependencyNode!.id) && 
            !this.canActivateArgument(dependencyNode as Argument, context, new Set(visited))) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Calculate all valid arguments based on accepted axioms and edge relationships
   */
  calculateValidArguments(
    allNodes: Node[], 
    acceptedAxioms: Set<string>
  ): Set<string> {
    const valid = new Set<string>();
    const context: ValidationContext = {
      acceptedAxioms,
      validArguments: valid,
      allNodes,
    };

    const argumentNodes = allNodes.filter(node => isArgument(node)) as Argument[];

    // Iteratively add arguments whose supporting conditions are met
    let changed = true;
    while (changed) {
      changed = false;
      
      for (const argument of argumentNodes) {
        if (valid.has(argument.id)) continue;
        
        if (this.canActivateArgument(argument, context)) {
          valid.add(argument.id);
          changed = true;
        }
      }
    }
    
    return valid;
  }
}