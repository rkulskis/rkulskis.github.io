#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const glob = require('glob');

const dataDir = path.resolve(__dirname, '../data');

function loadAllData() {
  const data = {
    axioms: [],
    arguments: [],
    edges: [],
    categories: [],
    sources: []
  };

  // Load axioms
  const axiomFiles = glob.sync('axioms/*.yaml', { cwd: dataDir });
  for (const file of axiomFiles) {
    const filePath = path.join(dataDir, file);
    const fileData = YAML.parse(fs.readFileSync(filePath, 'utf8'));
    if (fileData && fileData.axioms) {
      data.axioms.push(...fileData.axioms);
    }
  }

  // Load arguments
  const argumentFiles = glob.sync('arguments/*.yaml', { cwd: dataDir });
  for (const file of argumentFiles) {
    const filePath = path.join(dataDir, file);
    const fileData = YAML.parse(fs.readFileSync(filePath, 'utf8'));
    if (fileData && fileData.arguments) {
      data.arguments.push(...fileData.arguments);
    }
  }

  // Load edges
  const edgeFiles = glob.sync('edges/*.yaml', { cwd: dataDir });
  for (const file of edgeFiles) {
    const filePath = path.join(dataDir, file);
    const fileData = YAML.parse(fs.readFileSync(filePath, 'utf8'));
    if (fileData && fileData.edges) {
      data.edges.push(...fileData.edges);
    }
  }

  // Load sources
  try {
    const sourcesData = YAML.parse(fs.readFileSync(path.join(dataDir, 'sources.yaml'), 'utf8'));
    if (sourcesData && sourcesData.sources) {
      data.sources = Object.entries(sourcesData.sources).map(([id, source]) => ({
        id,
        ...source
      }));
    }
  } catch (error) {
    console.warn('No sources.yaml found');
  }

  return data;
}

function validateConsistency(data) {
  const errors = [];
  const warnings = [];
  const orphanedArguments = [];
  const circularDependencies = [];

  // Create ID sets for quick lookup
  const axiomIds = new Set(data.axioms.map(a => a.id));
  const argumentIds = new Set(data.arguments.map(a => a.id));
  const allNodeIds = new Set([...axiomIds, ...argumentIds]);
  const sourceIds = new Set(data.sources.map(s => s.id));

  console.log(`Validating ${data.axioms.length} axioms, ${data.arguments.length} arguments, ${data.edges.length} edges`);

  // 1. Check that all arguments have valid dependencies
  for (const arg of data.arguments) {
    if (arg.dependencies) {
      for (const depId of arg.dependencies) {
        if (!allNodeIds.has(depId)) {
          errors.push(`Argument ${arg.id} depends on non-existent node: ${depId}`);
        }
      }
    }

    // Check activation conditions
    if (arg.activation_conditions) {
      if (arg.activation_conditions.required_axioms) {
        for (const axId of arg.activation_conditions.required_axioms) {
          if (!axiomIds.has(axId)) {
            errors.push(`Argument ${arg.id} requires non-existent axiom: ${axId}`);
          }
        }
      }
      if (arg.activation_conditions.required_arguments) {
        for (const argId of arg.activation_conditions.required_arguments) {
          if (!argumentIds.has(argId)) {
            errors.push(`Argument ${arg.id} requires non-existent argument: ${argId}`);
          }
        }
      }
    }

    // Check attribution references
    if (arg.metadata?.attribution) {
      for (const sourceId of arg.metadata.attribution) {
        if (!sourceIds.has(sourceId)) {
          warnings.push(`Argument ${arg.id} references unknown source: ${sourceId}`);
        }
      }
    }
  }

  // 2. Check that all axioms have valid attribution
  for (const axiom of data.axioms) {
    if (axiom.metadata?.attribution) {
      for (const sourceId of axiom.metadata.attribution) {
        if (!sourceIds.has(sourceId)) {
          warnings.push(`Axiom ${axiom.id} references unknown source: ${sourceId}`);
        }
      }
    }
  }

  // 3. Find orphaned arguments (no path to axioms)
  function findPathToAxioms(argId, visited = new Set()) {
    if (visited.has(argId)) {
      circularDependencies.push(`Circular dependency detected involving: ${argId}`);
      return false;
    }
    
    const arg = data.arguments.find(a => a.id === argId);
    if (!arg) return false;
    
    visited.add(argId);
    
    // Check if directly depends on axioms
    if (arg.dependencies) {
      for (const depId of arg.dependencies) {
        if (axiomIds.has(depId)) {
          return true; // Found path to axiom
        }
      }
      
      // Check if depends on arguments that have paths to axioms
      for (const depId of arg.dependencies) {
        if (argumentIds.has(depId)) {
          if (findPathToAxioms(depId, new Set(visited))) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  for (const arg of data.arguments) {
    if (!findPathToAxioms(arg.id)) {
      orphanedArguments.push(arg.id);
    }
  }

  // 4. Check edge consistency
  for (const edge of data.edges) {
    // Handle both fromNode/toNode and fromAxiom/toAxiom formats
    const fromNode = edge.fromNode || edge.fromAxiom;
    const toNode = edge.toNode || edge.toAxiom;
    
    if (!allNodeIds.has(fromNode)) {
      errors.push(`Edge ${edge.id} has invalid fromNode: ${fromNode}`);
    }
    if (!allNodeIds.has(toNode)) {
      errors.push(`Edge ${edge.id} has invalid toNode: ${toNode}`);
    }
  }

  // 5. Generate activation analysis
  console.log('\n=== Activation Analysis ===');
  
  function canActivateArgument(argId, acceptedAxioms, acceptedArguments = new Set()) {
    const arg = data.arguments.find(a => a.id === argId);
    if (!arg || !arg.activation_conditions) return false;
    
    const conditions = arg.activation_conditions;
    
    // Check required axioms
    if (conditions.required_axioms) {
      for (const axId of conditions.required_axioms) {
        if (!acceptedAxioms.has(axId)) return false;
      }
    }
    
    // Check forbidden axioms
    if (conditions.forbidden_axioms) {
      for (const axId of conditions.forbidden_axioms) {
        if (acceptedAxioms.has(axId)) return false;
      }
    }
    
    // Check required arguments (recursive)
    if (conditions.required_arguments) {
      for (const reqArgId of conditions.required_arguments) {
        if (!acceptedArguments.has(reqArgId)) {
          if (!canActivateArgument(reqArgId, acceptedAxioms, acceptedArguments)) {
            return false;
          }
          acceptedArguments.add(reqArgId);
        }
      }
    }
    
    return true;
  }

  // Test different axiom combinations
  const allAxioms = new Set(data.axioms.map(a => a.id));
  let activatableArgs = [];
  
  for (const arg of data.arguments) {
    if (canActivateArgument(arg.id, allAxioms)) {
      activatableArgs.push(arg.id);
    }
  }
  
  console.log(`With all axioms accepted: ${activatableArgs.length}/${data.arguments.length} arguments can be activated`);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    orphanedArguments,
    circularDependencies: [...new Set(circularDependencies)]
  };
}

// Run validation
const data = loadAllData();
const validation = validateConsistency(data);

console.log('\n=== VALIDATION RESULTS ===');
console.log(`Valid: ${validation.isValid}`);

if (validation.errors.length > 0) {
  console.log('\nERRORS:');
  validation.errors.forEach(error => console.log(`  ❌ ${error}`));
}

if (validation.warnings.length > 0) {
  console.log('\nWARNINGS:');
  validation.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
}

if (validation.orphanedArguments.length > 0) {
  console.log('\nORPHANED ARGUMENTS (no path to axioms):');
  validation.orphanedArguments.forEach(arg => console.log(`  🔗 ${arg}`));
}

if (validation.circularDependencies.length > 0) {
  console.log('\nCIRCULAR DEPENDENCIES:');
  validation.circularDependencies.forEach(circular => console.log(`  🔄 ${circular}`));
}

console.log('\n=== SUMMARY ===');
console.log(`📊 Axioms: ${data.axioms.length}`);
console.log(`📊 Arguments: ${data.arguments.length}`);
console.log(`📊 Edges: ${data.edges.length}`);
console.log(`📊 Sources: ${data.sources.length}`);

if (validation.isValid) {
  console.log('✅ All validation checks passed!');
} else {
  console.log('❌ Validation failed - please fix errors above');
  process.exit(1);
}