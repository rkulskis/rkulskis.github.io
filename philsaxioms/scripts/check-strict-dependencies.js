#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const glob = require('glob');

const dataDir = path.resolve(__dirname, '../data');

function loadAllData() {
  const data = { axioms: [], arguments: [] };

  const axiomFiles = glob.sync('axioms/*.yaml', { cwd: dataDir });
  for (const file of axiomFiles) {
    const filePath = path.join(dataDir, file);
    const fileData = YAML.parse(fs.readFileSync(filePath, 'utf8'));
    if (fileData && fileData.axioms) {
      data.axioms.push(...fileData.axioms);
    }
  }

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

function checkStrictDependencies(data) {
  const axiomIds = new Set(data.axioms.map(a => a.id));
  const argumentIds = new Set(data.arguments.map(a => a.id));
  
  console.log('=== STRICT DEPENDENCY CHECK ===\n');
  
  // Find arguments without proper activation conditions
  const problematicArgs = [];
  
  for (const arg of data.arguments) {
    if (!arg.activation_conditions) {
      problematicArgs.push({
        id: arg.id,
        title: arg.title,
        level: arg.level,
        issue: 'Missing activation_conditions'
      });
      continue;
    }
    
    const conditions = arg.activation_conditions;
    const hasAxiomReqs = conditions.required_axioms && conditions.required_axioms.length > 0;
    const hasArgReqs = conditions.required_arguments && conditions.required_arguments.length > 0;
    
    if (!hasAxiomReqs && !hasArgReqs) {
      problematicArgs.push({
        id: arg.id,
        title: arg.title,
        level: arg.level,
        issue: 'No required axioms or arguments - could auto-activate'
      });
    }
    
    // Check if level 3+ arguments depend directly on axioms (should go through lower levels)
    if (arg.level >= 3 && hasAxiomReqs) {
      problematicArgs.push({
        id: arg.id,
        title: arg.title,
        level: arg.level,
        issue: `Level ${arg.level} argument directly requires axioms: ${conditions.required_axioms.join(', ')}`
      });
    }
  }
  
  // Display problematic arguments by level
  const byLevel = {};
  for (const arg of problematicArgs) {
    if (!byLevel[arg.level]) byLevel[arg.level] = [];
    byLevel[arg.level].push(arg);
  }
  
  for (const level of Object.keys(byLevel).sort()) {
    console.log(`--- Level ${level} Issues ---`);
    for (const arg of byLevel[level]) {
      console.log(`❌ ${arg.title}`);
      console.log(`   Issue: ${arg.issue}\n`);
    }
  }
  
  console.log(`\nTotal problematic arguments: ${problematicArgs.length}/66`);
  
  return problematicArgs;
}

const data = loadAllData();
const issues = checkStrictDependencies(data);

if (issues.length > 0) {
  console.log('\n=== RECOMMENDED FIXES ===');
  console.log('1. Remove direct axiom dependencies from Level 3+ arguments');
  console.log('2. Ensure all arguments have proper activation conditions');
  console.log('3. Make Level 3+ arguments depend only on Level 2 arguments');
}