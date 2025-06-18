#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const dataDir = path.resolve(__dirname, '../data');

// Enhancement mappings for level 1 arguments
const level1Enhancements = {
  objective_reality_exists: {
    dependencies: ["something_exists", "logic_works"],
    activation_conditions: { required_axioms: ["something_exists", "logic_works"] },
    attribution: ["materialism", "aristotle"],
    controversy: 0.3
  },
  knowledge_is_possible: {
    dependencies: ["patterns_exist", "minds_can_reason"],
    activation_conditions: { required_axioms: ["patterns_exist", "minds_can_reason"] },
    attribution: ["empiricism", "rationalism", "kant"],
    controversy: 0.2
  },
  moral_facts_exist: {
    dependencies: ["differences_matter", "suffering_exists"],
    activation_conditions: { required_axioms: ["differences_matter", "suffering_exists"] },
    attribution: ["virtue_ethics", "deontology", "aquinas"],
    controversy: 0.5
  },
  moral_responsibility_exists: {
    dependencies: ["actions_have_consequences", "choice_exists"],
    activation_conditions: { required_axioms: ["actions_have_consequences", "choice_exists"] },
    attribution: ["deontology", "virtue_ethics", "kant"],
    controversy: 0.4
  },
  rational_discourse_possible: {
    dependencies: ["communication_possible", "minds_can_reason"],
    activation_conditions: { required_axioms: ["communication_possible", "minds_can_reason"] },
    attribution: ["rationalism", "empiricism", "voltaire"],
    controversy: 0.2
  },
  social_contracts_possible: {
    dependencies: ["cooperation_possible", "actions_have_consequences"],
    activation_conditions: { required_axioms: ["cooperation_possible", "actions_have_consequences"] },
    attribution: ["social_contract", "locke", "rousseau"],
    controversy: 0.3
  },
  causal_laws_exist: {
    dependencies: ["patterns_exist", "actions_have_consequences"],
    activation_conditions: { required_axioms: ["patterns_exist", "actions_have_consequences"] },
    attribution: ["empiricism", "materialism", "hume"],
    controversy: 0.2
  },
  stable_reality_exists: {
    dependencies: ["something_exists", "patterns_exist"],
    activation_conditions: { required_axioms: ["something_exists", "patterns_exist"] },
    attribution: ["materialism", "empiricism"],
    controversy: 0.2
  },
  values_guide_choices: {
    dependencies: ["choice_exists", "differences_matter"],
    activation_conditions: { required_axioms: ["choice_exists", "differences_matter"] },
    attribution: ["virtue_ethics", "existentialism"],
    controversy: 0.3
  },
  harm_prevention_matters: {
    dependencies: ["suffering_exists", "actions_have_consequences"],
    activation_conditions: { required_axioms: ["suffering_exists", "actions_have_consequences"] },
    attribution: ["utilitarianism", "mill", "jesus"],
    controversy: 0.2
  },
  shared_reasoning_possible: {
    dependencies: ["logic_works", "communication_possible"],
    activation_conditions: { required_axioms: ["logic_works", "communication_possible"] },
    attribution: ["rationalism", "empiricism"],
    controversy: 0.2
  },
  justice_possible: {
    dependencies: ["cooperation_possible", "moral_facts_exist"],
    activation_conditions: { required_axioms: ["cooperation_possible"], required_arguments: ["moral_facts_exist"] },
    attribution: ["social_contract", "rawls", "aristotle"],
    controversy: 0.4
  }
};

// Enhancement mappings for level 2 arguments
const level2Enhancements = {
  scientific_method_valid: {
    dependencies: ["knowledge_is_possible", "objective_reality_exists"],
    activation_conditions: { required_arguments: ["knowledge_is_possible", "objective_reality_exists"] },
    attribution: ["empiricism", "simons"],
    controversy: 0.1
  },
  moral_progress_possible: {
    dependencies: ["moral_facts_exist", "rational_discourse_possible"],
    activation_conditions: { required_arguments: ["moral_facts_exist", "rational_discourse_possible"] },
    attribution: ["utilitarianism", "kant", "voltaire"],
    controversy: 0.4
  },
  prediction_and_control_possible: {
    dependencies: ["causal_laws_exist", "knowledge_is_possible"],
    activation_conditions: { required_arguments: ["causal_laws_exist", "knowledge_is_possible"] },
    attribution: ["empiricism", "materialism"],
    controversy: 0.2
  },
  legitimate_government_possible: {
    dependencies: ["justice_possible", "social_contracts_possible"],
    activation_conditions: { required_arguments: ["justice_possible", "social_contracts_possible"] },
    attribution: ["social_contract", "locke", "rawls"],
    controversy: 0.3
  },
  ethical_obligations_exist: {
    dependencies: ["moral_responsibility_exists", "harm_prevention_matters"],
    activation_conditions: { required_arguments: ["moral_responsibility_exists", "harm_prevention_matters"] },
    attribution: ["deontology", "utilitarianism", "kant"],
    controversy: 0.3
  },
  metaphysical_realism_true: {
    dependencies: ["objective_reality_exists", "stable_reality_exists"],
    activation_conditions: { required_arguments: ["objective_reality_exists", "stable_reality_exists"] },
    attribution: ["materialism", "aristotle"],
    controversy: 0.4
  },
  objective_values_exist: {
    dependencies: ["values_guide_choices", "moral_facts_exist"],
    activation_conditions: { required_arguments: ["values_guide_choices", "moral_facts_exist"] },
    attribution: ["virtue_ethics", "natural_law", "aquinas"],
    controversy: 0.6
  },
  universal_rationality_possible: {
    dependencies: ["shared_reasoning_possible", "knowledge_is_possible"],
    activation_conditions: { required_arguments: ["shared_reasoning_possible", "knowledge_is_possible"] },
    attribution: ["rationalism", "kant"],
    controversy: 0.4
  },
  philosophical_inquiry_valuable: {
    dependencies: ["rational_discourse_possible", "moral_progress_possible"],
    activation_conditions: { required_arguments: ["rational_discourse_possible", "moral_progress_possible"] },
    attribution: ["rationalism", "empiricism", "voltaire"],
    controversy: 0.2
  },
  natural_kinds_exist: {
    dependencies: ["stable_reality_exists", "causal_laws_exist"],
    activation_conditions: { required_arguments: ["stable_reality_exists", "causal_laws_exist"] },
    attribution: ["materialism", "empiricism"],
    controversy: 0.6
  },
  rule_of_law_essential: {
    dependencies: ["social_contracts_possible", "legitimate_government_possible"],
    activation_conditions: { required_arguments: ["social_contracts_possible", "legitimate_government_possible"] },
    attribution: ["social_contract", "locke"],
    controversy: 0.2
  },
  human_rights_universal: {
    dependencies: ["ethical_obligations_exist", "legitimate_government_possible"],
    activation_conditions: { required_arguments: ["ethical_obligations_exist", "legitimate_government_possible"] },
    attribution: ["natural_law", "kant", "locke"],
    controversy: 0.4
  }
};

function enhanceArguments(filePath, enhancements) {
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

// Process level 1 arguments
enhanceArguments(path.join(dataDir, 'arguments/level1.yaml'), level1Enhancements);

// Process level 2 arguments  
enhanceArguments(path.join(dataDir, 'arguments/level2.yaml'), level2Enhancements);

console.log('Argument enhancement complete!');