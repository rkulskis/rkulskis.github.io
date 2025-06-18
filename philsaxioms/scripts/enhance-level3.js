#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const dataDir = path.resolve(__dirname, '../data');

// Enhancement mappings for level 3 arguments
const level3Enhancements = {
  naturalism_well_supported: {
    dependencies: ["scientific_method_valid", "metaphysical_realism_true"],
    activation_conditions: { required_arguments: ["scientific_method_valid", "metaphysical_realism_true"] },
    attribution: ["materialism", "empiricism", "simons"],
    controversy: 0.4
  },
  enlightenment_project_valid: {
    dependencies: ["moral_progress_possible", "universal_rationality_possible"],
    activation_conditions: { required_arguments: ["moral_progress_possible", "universal_rationality_possible"] },
    attribution: ["rationalism", "voltaire", "kant"],
    controversy: 0.3
  },
  secular_humanism_viable: {
    dependencies: ["ethical_obligations_exist", "naturalism_well_supported"],
    activation_conditions: { required_arguments: ["ethical_obligations_exist", "naturalism_well_supported"] },
    attribution: ["utilitarianism", "empiricism", "voltaire"],
    controversy: 0.6
  },
  liberal_democracy_optimal: {
    dependencies: ["human_rights_universal", "rule_of_law_essential"],
    activation_conditions: { required_arguments: ["human_rights_universal", "rule_of_law_essential"] },
    attribution: ["social_contract", "locke", "rawls"],
    controversy: 0.4
  },
  technological_progress_beneficial: {
    dependencies: ["prediction_and_control_possible", "moral_progress_possible"],
    activation_conditions: { required_arguments: ["prediction_and_control_possible", "moral_progress_possible"] },
    attribution: ["empiricism", "utilitarianism", "simons"],
    controversy: 0.3
  },
  artificial_consciousness_possible: {
    dependencies: ["naturalism_well_supported", "prediction_and_control_possible"],
    activation_conditions: { required_arguments: ["naturalism_well_supported", "prediction_and_control_possible"] },
    attribution: ["materialism", "simons"],
    controversy: 0.7
  },
  effective_institutions_achievable: {
    dependencies: ["legitimate_government_possible", "philosophical_inquiry_valuable"],
    activation_conditions: { required_arguments: ["legitimate_government_possible", "philosophical_inquiry_valuable"] },
    attribution: ["social_contract", "dimon", "rawls"],
    controversy: 0.3
  },
  objective_moral_knowledge_possible: {
    dependencies: ["objective_values_exist", "universal_rationality_possible"],
    activation_conditions: { required_arguments: ["objective_values_exist", "universal_rationality_possible"] },
    attribution: ["virtue_ethics", "natural_law", "kant"],
    controversy: 0.5
  },
  mind_body_problem_solvable: {
    dependencies: ["naturalism_well_supported", "scientific_method_valid"],
    activation_conditions: { required_arguments: ["naturalism_well_supported", "scientific_method_valid"] },
    attribution: ["materialism", "empiricism"],
    controversy: 0.8
  },
  global_cooperation_achievable: {
    dependencies: ["effective_institutions_achievable", "enlightenment_project_valid"],
    activation_conditions: { required_arguments: ["effective_institutions_achievable", "enlightenment_project_valid"] },
    attribution: ["social_contract", "utilitarianism", "dimon"],
    controversy: 0.5
  }
};

function enhanceLevel3Arguments(filePath, enhancements) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = YAML.parse(content);
    
    if (!data || !data.arguments) {
      console.error(`No arguments found in ${filePath}`);
      return;
    }
    
    let modified = false;
    
    data.arguments.forEach(arg => {
      if (enhancements[arg.id]) {
        const enhancement = enhancements[arg.id];
        
        // Add dependencies
        if (enhancement.dependencies) {
          arg.dependencies = enhancement.dependencies;
          modified = true;
        }
        
        // Add activation conditions
        if (enhancement.activation_conditions) {
          arg.activation_conditions = enhancement.activation_conditions;
          modified = true;
        }
        
        // Enhance metadata
        if (!arg.metadata) arg.metadata = {};
        
        if (enhancement.attribution) {
          arg.metadata.attribution = enhancement.attribution;
          modified = true;
        }
        
        if (enhancement.controversy !== undefined) {
          arg.metadata.controversy = enhancement.controversy;
          modified = true;
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, YAML.stringify(data, null, 2));
      console.log(`Enhanced ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Process level 3 arguments
enhanceLevel3Arguments(path.join(dataDir, 'arguments/level3.yaml'), level3Enhancements);

console.log('Level 3 argument enhancement complete!');