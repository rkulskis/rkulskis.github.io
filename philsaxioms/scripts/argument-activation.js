#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const glob = require('glob');

const dataDir = path.resolve(__dirname, '../data');

function loadAllData() {
  const data = {
    axioms: [],
    arguments: []
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

  return data;
}

function canActivateArgument(argId, acceptedAxioms, acceptedArguments, data, visited = new Set()) {
  if (visited.has(argId)) {
    return false; // Avoid infinite recursion
  }
  
  const arg = data.arguments.find(a => a.id === argId);
  if (!arg || !arg.activation_conditions) return false;
  
  visited.add(argId);
  
  const conditions = arg.activation_conditions;
  
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
      if (!acceptedArguments.has(reqArgId)) {
        if (!canActivateArgument(reqArgId, acceptedAxioms, acceptedArguments, data, new Set(visited))) {
          return false;
        }
        acceptedArguments.add(reqArgId);
      }
    }
  }
  
  // Check forbidden arguments
  if (conditions.forbidden_arguments) {
    for (const forbiddenArgId of conditions.forbidden_arguments) {
      if (acceptedArguments.has(forbiddenArgId)) {
        return false;
      }
    }
  }
  
  return true;
}

function analyzeActivationPatterns(data) {
  const axiomIds = data.axioms.map(a => a.id);
  const argumentIds = data.arguments.map(a => a.id);
  
  console.log('=== ARGUMENT ACTIVATION ANALYSIS ===\n');
  
  // Test various axiom combinations
  const scenarios = [
    {
      name: "Full Acceptance",
      acceptedAxioms: new Set(axiomIds),
      rejectedAxioms: new Set()
    },
    {
      name: "Skeptical Materialist",
      acceptedAxioms: new Set([
        "something_exists", "logic_works", "patterns_exist", 
        "minds_can_reason", "actions_have_consequences"
      ]),
      rejectedAxioms: new Set([
        "choice_exists", "cooperation_possible"
      ])
    },
    {
      name: "Religious Believer", 
      acceptedAxioms: new Set([
        "something_exists", "logic_works", "differences_matter",
        "suffering_exists", "choice_exists", "cooperation_possible",
        "communication_possible"
      ]),
      rejectedAxioms: new Set([
        "patterns_exist", "minds_can_reason"
      ])
    },
    {
      name: "Radical Skeptic",
      acceptedAxioms: new Set([
        "something_exists", "logic_works"
      ]),
      rejectedAxioms: new Set([
        "patterns_exist", "minds_can_reason", "choice_exists"
      ])
    },
    {
      name: "Utilitarian Pragmatist",
      acceptedAxioms: new Set([
        "something_exists", "logic_works", "patterns_exist",
        "minds_can_reason", "actions_have_consequences", 
        "suffering_exists", "cooperation_possible"
      ]),
      rejectedAxioms: new Set([
        "choice_exists"
      ])
    },
    {
      name: "Libertarian Individual",
      acceptedAxioms: new Set([
        "something_exists", "logic_works", "differences_matter",
        "choice_exists", "actions_have_consequences"
      ]),
      rejectedAxioms: new Set([
        "cooperation_possible", "communication_possible"
      ])
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`Accepts: ${Array.from(scenario.acceptedAxioms).join(', ')}`);
    if (scenario.rejectedAxioms.size > 0) {
      console.log(`Rejects: ${Array.from(scenario.rejectedAxioms).join(', ')}`);
    }
    
    const acceptedArguments = new Set();
    let activatedCount = 0;
    
    // Try to activate each argument
    for (const arg of data.arguments) {
      if (canActivateArgument(arg.id, scenario.acceptedAxioms, acceptedArguments, data)) {
        acceptedArguments.add(arg.id);
        activatedCount++;
      }
    }
    
    console.log(`Activated Arguments: ${activatedCount}/${data.arguments.length}`);
    
    // Show some key activated arguments by level
    const activatedByLevel = {};
    for (const argId of acceptedArguments) {
      const arg = data.arguments.find(a => a.id === argId);
      if (!activatedByLevel[arg.level]) activatedByLevel[arg.level] = [];
      activatedByLevel[arg.level].push(arg.title);
    }
    
    for (const level of Object.keys(activatedByLevel).sort()) {
      console.log(`  Level ${level}: ${activatedByLevel[level].length} arguments`);
      if (activatedByLevel[level].length <= 5) {
        console.log(`    ${activatedByLevel[level].join(', ')}`);
      }
    }
  }
  
  // Analyze argument dependencies
  console.log('\n=== ARGUMENT DEPENDENCY ANALYSIS ===\n');
  
  const dependencyGraph = {};
  for (const arg of data.arguments) {
    dependencyGraph[arg.id] = {
      title: arg.title,
      level: arg.level,
      dependencies: arg.dependencies || [],
      requiredAxioms: arg.activation_conditions?.required_axioms || [],
      requiredArguments: arg.activation_conditions?.required_arguments || []
    };
  }
  
  // Find arguments that directly depend on each axiom
  for (const axiom of data.axioms) {
    const directlyDependent = data.arguments.filter(arg => 
      arg.activation_conditions?.required_axioms?.includes(axiom.id)
    );
    
    if (directlyDependent.length > 0) {
      console.log(`${axiom.title} (${axiom.id}):`);
      for (const arg of directlyDependent) {
        console.log(`  → ${arg.title} (Level ${arg.level})`);
      }
      console.log();
    }
  }
}

// Run analysis
const data = loadAllData();
analyzeActivationPatterns(data);