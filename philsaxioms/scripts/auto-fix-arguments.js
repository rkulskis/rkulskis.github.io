#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { YAMLStructureValidator } = require('./validate-yaml-structure');

class ArgumentAutoFixer extends YAMLStructureValidator {
  constructor(dataPath) {
    super(dataPath);
    this.suggestedAxioms = [];
    this.autoFixEnabled = process.argv.includes('--auto-fix');
  }

  // Analyze unreachable arguments and suggest/create axioms
  async analyzeAndFixUnreachableArguments() {
    console.log('🔧 Analyzing unreachable arguments and suggesting fixes...\n');
    
    const results = await this.validate();
    const unreachableArgs = results.errors.filter(e => e.type === 'no_activation_path');
    
    if (unreachableArgs.length === 0) {
      console.log('✅ All arguments are reachable through axiom paths!');
      return { fixed: 0, suggested: 0 };
    }

    console.log(`Found ${unreachableArgs.length} unreachable argument(s):`);
    
    let fixedCount = 0;
    let suggestedCount = 0;

    for (const error of unreachableArgs) {
      const argumentId = error.context.id;
      const argument = this.arguments.find(a => a.id === argumentId);
      
      if (!argument) continue;

      console.log(`\n🔍 Analyzing: ${argument.title}`);
      
      const suggestions = this.generateAxiomSuggestions(argument);
      
      if (suggestions.length > 0) {
        console.log(`   Suggested axioms to add:`);
        suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.title}: "${suggestion.description}"`);
        });
        
        if (this.autoFixEnabled) {
          const added = await this.addSuggestedAxioms(suggestions);
          fixedCount += added;
          console.log(`   ✅ Added ${added} axiom(s) automatically`);
        } else {
          suggestedCount += suggestions.length;
          console.log(`   💡 Run with --auto-fix to add these axioms automatically`);
        }
      }
    }

    if (this.autoFixEnabled && fixedCount > 0) {
      console.log(`\n✅ Auto-fixed ${fixedCount} argument(s) by adding ${this.suggestedAxioms.length} axiom(s)`);
      console.log('🔄 Re-running validation to verify fixes...');
      
      // Reload data and re-validate
      this.loadData();
      const newResults = await this.validate();
      const stillUnreachable = newResults.errors.filter(e => e.type === 'no_activation_path');
      
      if (stillUnreachable.length === 0) {
        console.log('🎉 All arguments are now reachable!');
      } else {
        console.log(`⚠️  ${stillUnreachable.length} argument(s) still unreachable - may need manual review`);
      }
    }

    return { fixed: fixedCount, suggested: suggestedCount };
  }

  // Generate axiom suggestions based on argument requirements
  generateAxiomSuggestions(argument) {
    const suggestions = [];
    
    if (!argument.activation_conditions) {
      // If no activation conditions, suggest a general axiom
      suggestions.push({
        id: `${argument.category}_foundation`,
        title: `${this.capitalize(argument.category)} has foundations`,
        description: `Basic principles and foundations exist in the domain of ${argument.category}`,
        category: argument.category,
        metadata: {
          auto_generated: true,
          for_argument: argument.id,
          difficulty: 'basic'
        }
      });
      return suggestions;
    }

    const conditions = argument.activation_conditions;
    
    // Check required axioms that don't exist
    if (conditions.required_axioms) {
      const existingAxiomIds = new Set(this.axioms.map(a => a.id));
      
      conditions.required_axioms.forEach(axId => {
        if (!existingAxiomIds.has(axId)) {
          suggestions.push(this.createAxiomFromId(axId, argument));
        }
      });
    }

    // If the argument depends on other arguments, check if we need bridge axioms
    if (conditions.required_arguments) {
      const bridgeAxiom = this.createBridgeAxiom(argument, conditions.required_arguments);
      if (bridgeAxiom) {
        suggestions.push(bridgeAxiom);
      }
    }

    // Create domain-specific axioms based on argument content
    const domainAxiom = this.createDomainAxiom(argument);
    if (domainAxiom) {
      suggestions.push(domainAxiom);
    }

    return suggestions;
  }

  // Create an axiom from an ID that doesn't exist
  createAxiomFromId(axId, referenceArgument) {
    // Generate axiom based on ID pattern
    const title = axId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      id: axId,
      title: title,
      description: `${title} as a foundational principle that enables reasoning about ${referenceArgument.category}`,
      category: referenceArgument.category,
      metadata: {
        auto_generated: true,
        for_argument: referenceArgument.id,
        difficulty: 'basic'
      }
    };
  }

  // Create a bridge axiom to connect argument dependencies
  createBridgeAxiom(argument, requiredArguments) {
    const category = argument.category;
    const bridgeId = `${category}_reasoning_valid`;
    
    // Check if this type of axiom already exists
    const existingBridge = this.axioms.find(a => 
      a.id.includes(category) && (a.id.includes('reasoning') || a.id.includes('valid'))
    );
    
    if (existingBridge) return null;

    return {
      id: bridgeId,
      title: `Reasoning in ${this.capitalize(category)} is valid`,
      description: `Logical reasoning and inference can produce valid conclusions in the domain of ${category}`,
      category: category,
      metadata: {
        auto_generated: true,
        for_argument: argument.id,
        bridges_to: requiredArguments,
        difficulty: 'intermediate'
      }
    };
  }

  // Create domain-specific axiom
  createDomainAxiom(argument) {
    const category = argument.category;
    const domainId = `${category}_domain_valid`;
    
    // Check if domain axiom exists
    const existingDomain = this.axioms.find(a => 
      a.category === category && a.id.includes('domain')
    );
    
    if (existingDomain) return null;

    const domainDescriptions = {
      metaphysics: "Metaphysical inquiry can yield meaningful insights about the nature of reality",
      epistemology: "Knowledge and understanding are achievable through proper methodology", 
      ethics: "Moral reasoning can distinguish between right and wrong actions",
      logic: "Logical principles provide reliable foundations for reasoning",
      consciousness: "Consciousness and mental phenomena are valid subjects of investigation",
      political: "Political and social arrangements can be evaluated and improved"
    };

    return {
      id: domainId,
      title: `${this.capitalize(category)} domain is valid`,
      description: domainDescriptions[category] || `The domain of ${category} contains valid principles and can be reasoned about`,
      category: category,
      metadata: {
        auto_generated: true,
        for_argument: argument.id,
        difficulty: 'basic'
      }
    };
  }

  // Add suggested axioms to the appropriate file
  async addSuggestedAxioms(suggestions) {
    let addedCount = 0;
    
    for (const axiom of suggestions) {
      // Check if axiom already exists
      const exists = this.axioms.find(a => a.id === axiom.id);
      if (exists) continue;

      // Add to axioms list and save to file
      this.axioms.push(axiom);
      this.suggestedAxioms.push(axiom);
      
      await this.addAxiomToFile(axiom);
      addedCount++;
    }

    return addedCount;
  }

  // Add axiom to the basic.yaml file
  async addAxiomToFile(axiom) {
    const axiomsFilePath = path.join(this.dataPath, 'axioms/basic.yaml');
    
    let content;
    if (fs.existsSync(axiomsFilePath)) {
      content = fs.readFileSync(axiomsFilePath, 'utf8');
    } else {
      content = 'axioms:\n';
    }

    const data = YAML.parse(content);
    if (!data.axioms) data.axioms = [];
    
    // Add the new axiom
    data.axioms.push(axiom);

    // Write back to file
    const newContent = YAML.stringify(data, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0
    });
    
    fs.writeFileSync(axiomsFilePath, newContent);
    console.log(`   📝 Added axiom '${axiom.id}' to ${axiomsFilePath}`);
  }

  // Add the argument to activation conditions if missing
  async fixArgumentActivationConditions(argument) {
    // If argument has no activation conditions, create them
    if (!argument.activation_conditions) {
      const category = argument.category;
      const basicAxiomId = `${category}_domain_valid`;
      
      // Ensure the domain axiom exists
      let domainAxiom = this.axioms.find(a => a.id === basicAxiomId);
      if (!domainAxiom) {
        domainAxiom = this.createDomainAxiom(argument);
        if (domainAxiom) {
          await this.addAxiomToFile(domainAxiom);
          this.axioms.push(domainAxiom);
        }
      }
      
      // Add activation conditions to the argument
      argument.activation_conditions = {
        required_axioms: [basicAxiomId]
      };
      
      await this.updateArgumentInFile(argument);
      console.log(`   🔧 Added activation conditions to argument '${argument.id}'`);
    }
  }

  // Update argument in its YAML file
  async updateArgumentInFile(argument) {
    const level = argument.level;
    const filePath = path.join(this.dataPath, `arguments/level${level}.yaml`);
    
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const data = YAML.parse(content);
    
    if (data.arguments) {
      const index = data.arguments.findIndex(a => a.id === argument.id);
      if (index >= 0) {
        data.arguments[index] = argument;
        
        const newContent = YAML.stringify(data, {
          indent: 2,
          lineWidth: 120,
          minContentWidth: 0
        });
        
        fs.writeFileSync(filePath, newContent);
      }
    }
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Generate questionnaire items for new axioms
  generateQuestionnaireItems() {
    if (this.suggestedAxioms.length === 0) return;
    
    console.log('\n📋 Generating questionnaire items for new axioms...');
    
    const questionnairePath = path.join(this.dataPath, 'questionnaire.yaml');
    let questionnaireData;
    
    if (fs.existsSync(questionnairePath)) {
      const content = fs.readFileSync(questionnairePath, 'utf8');
      questionnaireData = YAML.parse(content);
    } else {
      questionnaireData = { questionnaire: [] };
    }

    this.suggestedAxioms.forEach(axiom => {
      const question = this.generateQuestionForAxiom(axiom);
      questionnaireData.questionnaire.push(question);
      console.log(`   ❓ Added question for '${axiom.id}'`);
    });

    const newContent = YAML.stringify(questionnaireData, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0
    });
    
    fs.writeFileSync(questionnairePath, newContent);
  }

  generateQuestionForAxiom(axiom) {
    const questions = {
      metaphysics: `Do you believe that ${axiom.description.toLowerCase()}?`,
      epistemology: `Do you think that ${axiom.description.toLowerCase()}?`,
      ethics: `Do you believe that ${axiom.description.toLowerCase()}?`,
      logic: `Do you accept that ${axiom.description.toLowerCase()}?`,
      consciousness: `Do you believe that ${axiom.description.toLowerCase()}?`,
      political: `Do you think that ${axiom.description.toLowerCase()}?`
    };

    return {
      axiomId: axiom.id,
      question: questions[axiom.category] || `Do you agree that ${axiom.description.toLowerCase()}?`,
      explanation: `This question explores whether you accept the foundational principle: ${axiom.description}`,
      category: axiom.category
    };
  }
}

// CLI execution
if (require.main === module) {
  // Find data path (not --auto-fix)
  let dataPath = path.join(__dirname, '../data');
  for (let i = 2; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('--') && fs.existsSync(process.argv[i])) {
      dataPath = process.argv[i];
      break;
    }
  }
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data directory not found: ${dataPath}`);
    process.exit(1);
  }

  const autoFixer = new ArgumentAutoFixer(dataPath);
  
  autoFixer.analyzeAndFixUnreachableArguments().then(results => {
    if (autoFixer.autoFixEnabled && autoFixer.suggestedAxioms.length > 0) {
      autoFixer.generateQuestionnaireItems();
      console.log('\n🎯 Summary:');
      console.log(`   - Fixed: ${results.fixed} argument(s)`);
      console.log(`   - Added: ${autoFixer.suggestedAxioms.length} axiom(s)`);
      console.log(`   - Generated: ${autoFixer.suggestedAxioms.length} questionnaire item(s)`);
    } else if (results.suggested > 0) {
      console.log('\n💡 Run with --auto-fix to automatically apply suggestions');
    }
    
    process.exit(results.fixed > 0 || results.suggested === 0 ? 0 : 1);
  }).catch(error => {
    console.error(`💥 Auto-fix crashed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { ArgumentAutoFixer };