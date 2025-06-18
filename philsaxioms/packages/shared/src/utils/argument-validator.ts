import { Node, Argument, Axiom, isAxiom, isArgument } from '../types';

export interface ValidationContext {
  acceptedAxioms: Set<string>;
  validArguments: Set<string>;
  allNodes: Node[];
}

export class ArgumentValidator {
  /**
   * Check if an argument can be activated based on supporting edges
   */
  canActivateArgument(
    argument: Argument, 
    context: ValidationContext, 
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(argument.id)) return false; // Prevent circular dependencies
    visited.add(argument.id);
    
    // Find nodes that this argument supports (builds upon)
    const supportedNodes = argument.edges
      .map(edge => context.allNodes.find(node => node.id === edge.to))
      .filter(node => node !== undefined);
    
    if (supportedNodes.length === 0) {
      // No support relationships, consider it valid
      return true;
    }
    
    // Check if all supported nodes are valid/accepted
    for (const supportedNode of supportedNodes) {
      if (isAxiom(supportedNode!)) {
        // Supported axiom: check if axiom is accepted
        if (!context.acceptedAxioms.has(supportedNode!.id)) {
          return false;
        }
      } else {
        // Supported argument: check if target argument is valid (recursive)
        if (!context.validArguments.has(supportedNode!.id) && 
            !this.canActivateArgument(supportedNode as Argument, context, new Set(visited))) {
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