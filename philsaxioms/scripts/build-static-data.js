#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const glob = require('glob');

const dataDir = path.resolve(__dirname, '../data');
const outputDir = path.resolve(__dirname, '../packages/frontend/public');

console.log('Converting YAML data to static JSON files...');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return YAML.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

function loadYamlFiles(pattern, arrayKey) {
  const files = glob.sync(pattern, { cwd: dataDir });
  const items = [];
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const data = loadYamlFile(filePath);
    if (data && data[arrayKey]) {
      items.push(...data[arrayKey]);
    }
  }
  
  return items;
}

// Load all data
const categories = loadYamlFile(path.join(dataDir, 'categories.yaml'))?.categories || [];
const nodesData = loadYamlFile(path.join(dataDir, 'nodes.yaml'));
const allNodes = nodesData?.nodes || [];

// Separate axioms and arguments based on edges
const axioms = allNodes.filter(node => node.edges && node.edges.length === 0);
const arguments = allNodes.filter(node => node.edges && node.edges.length > 0);

// Generate questionnaire from axioms (nodes with no edges)
const axiomNodes = allNodes.filter(node => node.edges && node.edges.length === 0);
const questionnaire = axiomNodes.map(axiom => ({
  id: `q_${axiom.id}`,
  text: axiom.title,
  description: axiom.description,
  axiomId: axiom.id,
  category: axiom.category
}));
const sourcesData = loadYamlFile(path.join(dataDir, 'sources.yaml'));
const sources = sourcesData?.sources || {};

// Convert sources object to array with IDs
const sourcesArray = Object.entries(sources).map(([id, source]) => ({
  id,
  ...source
}));

// Create combined data file
const graphData = {
  categories,
  nodes: allNodes, // Use all nodes directly from YAML
  sources: sourcesArray
};

// Write JSON files
fs.writeFileSync(
  path.join(outputDir, 'graph-data.json'),
  JSON.stringify(graphData, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'questionnaire.json'),
  JSON.stringify(questionnaire, null, 2)
);

// Calculate total edges from all nodes
const totalEdges = allNodes.reduce((sum, node) => sum + (node.edges?.length || 0), 0);

console.log(`Generated static data files:`);
console.log(`- ${axioms.length} axioms`);
console.log(`- ${arguments.length} arguments`);
console.log(`- ${totalEdges} edges`);
console.log(`- ${categories.length} categories`);
console.log(`- ${sourcesArray.length} sources`);
console.log(`- ${questionnaire.length} questionnaire items`);
console.log('Static data generation complete!');