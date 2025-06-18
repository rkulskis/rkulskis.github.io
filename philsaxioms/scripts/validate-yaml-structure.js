#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

class PhilosophicalValidationError extends Error {
  constructor(message, type = 'validation', context = {}) {
    super(message);
    this.name = 'PhilosophicalValidationError';
    this.type = type;
    this.context = context;
  }
}

class YAMLStructureValidator {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.axioms = [];
    this.arguments = [];
    this.edges = [];
    this.categories = [];
    this.sources = [];
    this.questionnaire = [];
    this.errors = [];
    this.warnings = [];
  }

  // Load all YAML data
  loadData() {
    try {
      // Load categories
      const categoriesPath = path.join(this.dataPath, 'categories.yaml');
      if (fs.existsSync(categoriesPath)) {
        const categoriesData = YAML.parse(fs.readFileSync(categoriesPath, 'utf8'));
        this.categories = categoriesData.categories || [];
      }

      // Load sources
      const sourcesPath = path.join(this.dataPath, 'sources.yaml');
      if (fs.existsSync(sourcesPath)) {
        const sourcesData = YAML.parse(fs.readFileSync(sourcesPath, 'utf8'));
        // Sources are stored as an object, convert to array with IDs
        if (sourcesData.sources && typeof sourcesData.sources === 'object') {
          this.sources = Object.keys(sourcesData.sources).map(id => ({
            id,
            ...sourcesData.sources[id]
          }));
        } else {
          this.sources = [];
        }
      }

      // Load questionnaire
      const questionnairePath = path.join(this.dataPath, 'questionnaire.yaml');
      if (fs.existsSync(questionnairePath)) {
        const questionnaireData = YAML.parse(fs.readFileSync(questionnairePath, 'utf8'));
        this.questionnaire = questionnaireData.questionnaire || [];
      }

      // Load axioms
      this.axioms = this.loadYamlFiles('axioms/*', 'axioms');
      
      // Load arguments
      this.arguments = this.loadYamlFiles('arguments/*', 'arguments');
      
      // Load edges
      this.edges = this.loadYamlFiles('edges/*', 'edges');

      console.log(`📊 Loaded: ${this.axioms.length} axioms, ${this.arguments.length} arguments, ${this.edges.length} edges`);
    } catch (error) {
      throw new PhilosophicalValidationError(`Failed to load YAML data: ${error.message}`, 'data_loading');
    }
  }

  loadYamlFiles(pattern, key) {
    const results = [];
    const dir = path.dirname(pattern);
    const filename = path.basename(pattern);
    const fullDir = path.join(this.dataPath, dir);
    
    if (!fs.existsSync(fullDir)) {
      console.warn(`⚠️  Directory not found: ${fullDir}`);
      return results;
    }

    const files = fs.readdirSync(fullDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .filter(file => filename === '*' || file === filename);

    for (const file of files) {
      try {
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = YAML.parse(content);
        
        if (data[key] && Array.isArray(data[key])) {
          results.push(...data[key]);
        }
      } catch (error) {
        this.addError(`Failed to parse ${file}: ${error.message}`, 'yaml_parsing', { file });
      }
    }
    
    return results;
  }

  // Add error/warning
  addError(message, type = 'validation', context = {}) {
    this.errors.push(new PhilosophicalValidationError(message, type, context));
  }

  addWarning(message, context = {}) {
    this.warnings.push({ message, context });
  }

  // Validate basic structure
  validateBasicStructure() {
    console.log('🔍 Validating basic YAML structure...');

    // Check required fields for axioms
    this.axioms.forEach((axiom, index) => {
      if (!axiom.id) {
        this.addError(`Axiom at index ${index} missing required 'id' field`, 'missing_field', { type: 'axiom', index });
      }
      if (!axiom.title) {
        this.addError(`Axiom '${axiom.id}' missing required 'title' field`, 'missing_field', { type: 'axiom', id: axiom.id });
      }
      if (!axiom.description) {
        this.addError(`Axiom '${axiom.id}' missing required 'description' field`, 'missing_field', { type: 'axiom', id: axiom.id });
      }
      if (!axiom.category) {
        this.addError(`Axiom '${axiom.id}' missing required 'category' field`, 'missing_field', { type: 'axiom', id: axiom.id });
      }
    });

    // Check required fields for arguments
    this.arguments.forEach((argument, index) => {
      if (!argument.id) {
        this.addError(`Argument at index ${index} missing required 'id' field`, 'missing_field', { type: 'argument', index });
      }
      if (!argument.title) {
        this.addError(`Argument '${argument.id}' missing required 'title' field`, 'missing_field', { type: 'argument', id: argument.id });
      }
      if (!argument.description) {
        this.addError(`Argument '${argument.id}' missing required 'description' field`, 'missing_field', { type: 'argument', id: argument.id });
      }
      if (!argument.conclusion) {
        this.addError(`Argument '${argument.id}' missing required 'conclusion' field`, 'missing_field', { type: 'argument', id: argument.id });
      }
      if (argument.level === undefined) {
        this.addError(`Argument '${argument.id}' missing required 'level' field`, 'missing_field', { type: 'argument', id: argument.id });
      }
    });

    // Check for duplicate IDs
    const axiomIds = new Set();
    const argumentIds = new Set();

    this.axioms.forEach(axiom => {
      if (axiomIds.has(axiom.id)) {
        this.addError(`Duplicate axiom ID: '${axiom.id}'`, 'duplicate_id', { type: 'axiom', id: axiom.id });
      }
      axiomIds.add(axiom.id);
    });

    this.arguments.forEach(argument => {
      if (argumentIds.has(argument.id)) {
        this.addError(`Duplicate argument ID: '${argument.id}'`, 'duplicate_id', { type: 'argument', id: argument.id });
      }
      argumentIds.add(argument.id);
    });
  }

  // Validate references
  validateReferences() {
    console.log('🔗 Validating references...');

    const axiomIds = new Set(this.axioms.map(a => a.id));
    const argumentIds = new Set(this.arguments.map(a => a.id));
    const categoryIds = new Set(this.categories.map(c => c.id));
    const sourceIds = new Set(this.sources.map(s => s.id));

    // Check axiom category references
    this.axioms.forEach(axiom => {
      if (axiom.category && !categoryIds.has(axiom.category)) {
        this.addError(`Axiom '${axiom.id}' references unknown category: '${axiom.category}'`, 'unknown_reference', 
          { type: 'axiom', id: axiom.id, reference: axiom.category, referenceType: 'category' });
      }
      
      if (axiom.metadata?.source && !sourceIds.has(axiom.metadata.source)) {
        this.addWarning(`Axiom '${axiom.id}' references unknown source: '${axiom.metadata.source}'`, 
          { type: 'axiom', id: axiom.id, reference: axiom.metadata.source, referenceType: 'source' });
      }
    });

    // Check argument references
    this.arguments.forEach(argument => {
      if (argument.category && !categoryIds.has(argument.category)) {
        this.addError(`Argument '${argument.id}' references unknown category: '${argument.category}'`, 'unknown_reference',
          { type: 'argument', id: argument.id, reference: argument.category, referenceType: 'category' });
      }

      if (argument.metadata?.source && !sourceIds.has(argument.metadata.source)) {
        this.addWarning(`Argument '${argument.id}' references unknown source: '${argument.metadata.source}'`, 
          { type: 'argument', id: argument.id, reference: argument.metadata.source, referenceType: 'source' });
      }

      // Check activation condition references
      if (argument.activation_conditions) {
        const conditions = argument.activation_conditions;
        
        if (conditions.required_axioms) {
          conditions.required_axioms.forEach(axId => {
            if (!axiomIds.has(axId)) {
              this.addError(`Argument '${argument.id}' requires unknown axiom: '${axId}'`, 'unknown_reference',
                { type: 'argument', id: argument.id, reference: axId, referenceType: 'axiom' });
            }
          });
        }

        if (conditions.forbidden_axioms) {
          conditions.forbidden_axioms.forEach(axId => {
            if (!axiomIds.has(axId)) {
              this.addError(`Argument '${argument.id}' forbids unknown axiom: '${axId}'`, 'unknown_reference',
                { type: 'argument', id: argument.id, reference: axId, referenceType: 'axiom' });
            }
          });
        }

        if (conditions.required_arguments) {
          conditions.required_arguments.forEach(argId => {
            if (!argumentIds.has(argId)) {
              this.addError(`Argument '${argument.id}' requires unknown argument: '${argId}'`, 'unknown_reference',
                { type: 'argument', id: argument.id, reference: argId, referenceType: 'argument' });
            }
          });
        }

        if (conditions.forbidden_arguments) {
          conditions.forbidden_arguments.forEach(argId => {
            if (!argumentIds.has(argId)) {
              this.addError(`Argument '${argument.id}' forbids unknown argument: '${argId}'`, 'unknown_reference',
                { type: 'argument', id: argument.id, reference: argId, referenceType: 'argument' });
            }
          });
        }
      }
    });

    // Check edge references
    this.edges.forEach(edge => {
      const allNodeIds = new Set([...axiomIds, ...argumentIds]);
      
      if (!allNodeIds.has(edge.fromNode)) {
        this.addError(`Edge '${edge.id}' references unknown fromNode: '${edge.fromNode}'`, 'unknown_reference',
          { type: 'edge', id: edge.id, reference: edge.fromNode, referenceType: 'node' });
      }
      
      if (!allNodeIds.has(edge.toNode)) {
        this.addError(`Edge '${edge.id}' references unknown toNode: '${edge.toNode}'`, 'unknown_reference',
          { type: 'edge', id: edge.id, reference: edge.toNode, referenceType: 'node' });
      }
    });

    // Check questionnaire references
    this.questionnaire.forEach(item => {
      if (item.axiomId && !axiomIds.has(item.axiomId)) {
        this.addError(`Questionnaire item references unknown axiom: '${item.axiomId}'`, 'unknown_reference',
          { type: 'questionnaire', axiomId: item.axiomId, referenceType: 'axiom' });
      }
    });
  }

  // Critical validation: Check if every argument can be activated through axiom paths
  validateArgumentActivationPaths() {
    console.log('🧠 Validating argument activation paths...');

    const axiomIds = new Set(this.axioms.map(a => a.id));
    const argumentMap = new Map(this.arguments.map(arg => [arg.id, arg]));
    
    // For each argument, check if there exists at least one combination of axioms that can activate it
    this.arguments.forEach(argument => {
      if (!argument.activation_conditions) {
        this.addError(`Argument '${argument.id}' has no activation conditions - cannot be activated`, 'no_activation_path',
          { type: 'argument', id: argument.id });
        return;
      }

      const canBeActivated = this.canArgumentBeActivatedByAnyAxiomCombination(argument, argumentMap, axiomIds);
      
      if (!canBeActivated) {
        this.addError(`Argument '${argument.id}' cannot be activated by any combination of axioms`, 'no_activation_path',
          { type: 'argument', id: argument.id, level: argument.level });
      }
    });
  }

  // Check if an argument can be activated by any valid combination of axioms
  canArgumentBeActivatedByAnyAxiomCombination(argument, argumentMap, axiomIds) {
    // Use recursive path-finding instead of brute force
    return this.findActivationPath(argument, argumentMap, axiomIds, new Set(), new Set());
  }

  // Recursively find if there's a path to activate an argument
  findActivationPath(argument, argumentMap, axiomIds, currentAxioms, visited) {
    if (visited.has(argument.id)) return false; // Prevent cycles
    if (!argument.activation_conditions) return false;
    
    visited.add(argument.id);
    
    const conditions = argument.activation_conditions;
    const requiredAxioms = new Set(currentAxioms);
    
    // Add required axioms
    if (conditions.required_axioms) {
      for (const axId of conditions.required_axioms) {
        if (axiomIds.has(axId)) {
          requiredAxioms.add(axId);
        } else {
          visited.delete(argument.id);
          return false; // Required axiom doesn't exist
        }
      }
    }
    
    // Check forbidden axioms
    if (conditions.forbidden_axioms) {
      for (const axId of conditions.forbidden_axioms) {
        if (requiredAxioms.has(axId)) {
          visited.delete(argument.id);
          return false; // Conflict with forbidden axiom
        }
      }
    }
    
    // Check required arguments recursively
    if (conditions.required_arguments) {
      for (const argId of conditions.required_arguments) {
        const requiredArg = argumentMap.get(argId);
        if (!requiredArg) {
          visited.delete(argument.id);
          return false; // Required argument doesn't exist
        }
        
        // Recursively check if required argument can be activated
        if (!this.findActivationPath(requiredArg, argumentMap, axiomIds, requiredAxioms, visited)) {
          visited.delete(argument.id);
          return false; // Required argument cannot be activated
        }
      }
    }
    
    visited.delete(argument.id);
    return true; // All conditions can be satisfied
  }

  // Check if an argument can be activated with a specific set of accepted axioms
  canArgumentBeActivatedWithAxioms(argument, argumentMap, acceptedAxioms, validArguments = new Set(), visited = new Set()) {
    if (visited.has(argument.id)) return false; // Prevent infinite recursion
    if (!argument.activation_conditions) return false;
    
    visited.add(argument.id);
    
    const conditions = argument.activation_conditions;
    
    // Check required axioms
    if (conditions.required_axioms) {
      for (const axId of conditions.required_axioms) {
        if (!acceptedAxioms.has(axId)) {
          return false;
        }
      }
    }
    
    // Check forbidden axioms
    if (conditions.forbidden_axioms) {
      for (const axId of conditions.forbidden_axioms) {
        if (acceptedAxioms.has(axId)) {
          return false;
        }
      }
    }
    
    // Check required arguments (recursive)
    if (conditions.required_arguments) {
      for (const reqArgId of conditions.required_arguments) {
        if (!validArguments.has(reqArgId)) {
          const reqArg = argumentMap.get(reqArgId);
          if (!reqArg) return false;
          
          if (!this.canArgumentBeActivatedWithAxioms(reqArg, argumentMap, acceptedAxioms, validArguments, new Set(visited))) {
            return false;
          }
          validArguments.add(reqArgId);
        }
      }
    }
    
    // Check forbidden arguments
    if (conditions.forbidden_arguments) {
      for (const forbiddenArgId of conditions.forbidden_arguments) {
        if (validArguments.has(forbiddenArgId)) {
          return false;
        }
      }
    }
    
    return true;
  }

  // Validate logical consistency
  validateLogicalConsistency() {
    console.log('⚖️  Validating logical consistency...');

    // Check for circular dependencies in argument requirements
    this.arguments.forEach(argument => {
      if (this.hasCircularDependency(argument.id, new Set(), new Map(this.arguments.map(a => [a.id, a])))) {
        this.addError(`Argument '${argument.id}' has circular dependency in its requirements`, 'circular_dependency',
          { type: 'argument', id: argument.id });
      }
    });

    // Check for contradictory activation conditions
    this.arguments.forEach(argument => {
      if (argument.activation_conditions) {
        const conditions = argument.activation_conditions;
        
        // Check if any required axiom is also forbidden
        if (conditions.required_axioms && conditions.forbidden_axioms) {
          const overlap = conditions.required_axioms.filter(ax => conditions.forbidden_axioms.includes(ax));
          if (overlap.length > 0) {
            this.addError(`Argument '${argument.id}' requires and forbids the same axioms: ${overlap.join(', ')}`, 'contradictory_conditions',
              { type: 'argument', id: argument.id, overlap });
          }
        }

        // Check if any required argument is also forbidden
        if (conditions.required_arguments && conditions.forbidden_arguments) {
          const overlap = conditions.required_arguments.filter(arg => conditions.forbidden_arguments.includes(arg));
          if (overlap.length > 0) {
            this.addError(`Argument '${argument.id}' requires and forbids the same arguments: ${overlap.join(', ')}`, 'contradictory_conditions',
              { type: 'argument', id: argument.id, overlap });
          }
        }
      }
    });
  }

  // Check for circular dependencies in argument requirements
  hasCircularDependency(argumentId, visited, argumentMap) {
    if (visited.has(argumentId)) return true;
    
    const argument = argumentMap.get(argumentId);
    if (!argument || !argument.activation_conditions || !argument.activation_conditions.required_arguments) {
      return false;
    }
    
    visited.add(argumentId);
    
    for (const reqArgId of argument.activation_conditions.required_arguments) {
      if (this.hasCircularDependency(reqArgId, new Set(visited), argumentMap)) {
        return true;
      }
    }
    
    return false;
  }

  // Validate questionnaire completeness
  validateQuestionnaire() {
    console.log('❓ Validating questionnaire completeness...');

    const axiomIds = new Set(this.axioms.map(a => a.id));
    const questionnaireAxiomIds = new Set(this.questionnaire.map(q => q.axiomId));

    // Check if all axioms have questionnaire items
    axiomIds.forEach(axId => {
      if (!questionnaireAxiomIds.has(axId)) {
        this.addWarning(`Axiom '${axId}' has no corresponding questionnaire item`, 
          { type: 'axiom', id: axId });
      }
    });

    // Check if questionnaire has orphaned items
    questionnaireAxiomIds.forEach(axId => {
      if (!axiomIds.has(axId)) {
        this.addError(`Questionnaire references non-existent axiom: '${axId}'`, 'orphaned_questionnaire',
          { type: 'questionnaire', axiomId: axId });
      }
    });
  }

  // Run all validations
  async validate() {
    console.log('🔍 Starting comprehensive YAML validation...\n');
    
    try {
      this.loadData();
      this.validateBasicStructure();
      this.validateReferences();
      this.validateArgumentActivationPaths();
      this.validateLogicalConsistency();
      this.validateQuestionnaire();
      
      return this.getResults();
    } catch (error) {
      this.addError(`Validation failed: ${error.message}`, 'validation_failure');
      return this.getResults();
    }
  }

  // Get validation results
  getResults() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;

    console.log('\n📋 Validation Results:');
    console.log('=' .repeat(50));
    
    if (hasErrors) {
      console.log(`❌ ${this.errors.length} Error(s) Found:`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message}`);
        if (Object.keys(error.context).length > 0) {
          console.log(`     Context: ${JSON.stringify(error.context)}`);
        }
      });
      console.log('');
    }

    if (hasWarnings) {
      console.log(`⚠️  ${this.warnings.length} Warning(s) Found:`);
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.message}`);
        if (Object.keys(warning.context).length > 0) {
          console.log(`     Context: ${JSON.stringify(warning.context)}`);
        }
      });
      console.log('');
    }

    if (!hasErrors && !hasWarnings) {
      console.log('✅ All validations passed! The YAML structure is valid.');
    } else if (!hasErrors) {
      console.log('✅ No errors found, but there are warnings to address.');
    } else {
      console.log('❌ Validation failed with errors that must be fixed.');
    }

    return {
      valid: !hasErrors,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        axioms: this.axioms.length,
        arguments: this.arguments.length,
        edges: this.edges.length,
        categories: this.categories.length
      }
    };
  }
}

// CLI execution
if (require.main === module) {
  const dataPath = process.argv[2] || path.join(__dirname, '../data');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data directory not found: ${dataPath}`);
    process.exit(1);
  }

  const validator = new YAMLStructureValidator(dataPath);
  
  validator.validate().then(results => {
    process.exit(results.valid ? 0 : 1);
  }).catch(error => {
    console.error(`💥 Validation crashed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { YAMLStructureValidator, PhilosophicalValidationError };