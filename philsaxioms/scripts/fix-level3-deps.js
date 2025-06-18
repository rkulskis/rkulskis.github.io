#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const dataDir = path.resolve(__dirname, '../data');

// Missing dependencies for level 3 arguments
const level3DepFixes = {
  constitutional_democracy_optimal: {
    dependencies: ["legitimate_government_possible", "rule_of_law_essential"],
    activation_conditions: { required_arguments: ["legitimate_government_possible", "rule_of_law_essential"] },
    attribution: ["social_contract", "locke", "rawls"],
    controversy: 0.3
  },
  virtue_ethics_valid: {
    dependencies: ["ethical_obligations_exist", "objective_values_exist"],
    activation_conditions: { required_arguments: ["ethical_obligations_exist", "objective_values_exist"] },
    attribution: ["virtue_ethics", "aristotle"],
    controversy: 0.4
  },
  interdisciplinary_inquiry_valuable: {
    dependencies: ["philosophical_inquiry_valuable", "scientific_method_valid"],
    activation_conditions: { required_arguments: ["philosophical_inquiry_valuable", "scientific_method_valid"] },
    attribution: ["empiricism", "rationalism"],
    controversy: 0.2
  },
  scientific_realism_about_theories: {
    dependencies: ["natural_kinds_exist", "universal_rationality_possible"],
    activation_conditions: { required_arguments: ["natural_kinds_exist", "universal_rationality_possible"] },
    attribution: ["empiricism", "materialism"],
    controversy: 0.5
  },
  democratic_governance_of_technology: {
    dependencies: ["constitutional_democracy_optimal", "technology_must_serve_humanity"],
    activation_conditions: { required_arguments: ["constitutional_democracy_optimal", "technology_must_serve_humanity"] },
    attribution: ["social_contract", "dimon"],
    controversy: 0.4
  },
  practical_wisdom_cultivation: {
    dependencies: ["virtue_ethics_valid", "interdisciplinary_inquiry_valuable"],
    activation_conditions: { required_arguments: ["virtue_ethics_valid", "interdisciplinary_inquiry_valuable"] },
    attribution: ["virtue_ethics", "aristotle"],
    controversy: 0.3
  }
};

function fixLevel3Dependencies(filePath, fixes) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = YAML.parse(content);
    
    if (!data || !data.arguments) {
      console.error(`No arguments found in ${filePath}`);
      return;
    }
    
    let modified = false;
    
    data.arguments.forEach(arg => {
      if (fixes[arg.id]) {
        const fix = fixes[arg.id];
        
        // Add dependencies
        if (fix.dependencies && !arg.dependencies) {
          arg.dependencies = fix.dependencies;
          modified = true;
        }
        
        // Add activation conditions
        if (fix.activation_conditions && !arg.activation_conditions) {
          arg.activation_conditions = fix.activation_conditions;
          modified = true;
        }
        
        // Enhance metadata
        if (!arg.metadata) arg.metadata = {};
        
        if (fix.attribution && !arg.metadata.attribution) {
          arg.metadata.attribution = fix.attribution;
          modified = true;
        }
        
        if (fix.controversy !== undefined && arg.metadata.controversy === undefined) {
          arg.metadata.controversy = fix.controversy;
          modified = true;
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, YAML.stringify(data, null, 2));
      console.log(`Fixed dependencies in ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

fixLevel3Dependencies(path.join(dataDir, 'arguments/level3.yaml'), level3DepFixes);

console.log('Level 3 dependency fixes complete!');