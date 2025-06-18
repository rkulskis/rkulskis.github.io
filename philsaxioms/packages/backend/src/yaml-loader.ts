import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import chokidar from 'chokidar';
import { Node, Axiom, Argument, AxiomCategory, QuestionnaireItem, GraphData, YamlLoaderBase } from '@philsaxioms/shared';

export class YamlDataLoader extends YamlLoaderBase {
  private cache: GraphData | null = null;
  private questionnaireCache: QuestionnaireItem[] | null = null;
  private watcher: chokidar.FSWatcher | null = null;
  private callbacks: (() => void)[] = [];

  constructor(dataPath: string) {
    super(path.resolve(dataPath));
    this.setupWatcher();
  }

  protected parseYaml<T>(content: string): T {
    return YAML.parse(content);
  }

  private setupWatcher() {
    this.watcher = chokidar.watch(this.dataPath, {
      ignored: /node_modules/,
      persistent: true
    });

    this.watcher.on('change', () => {
      console.log('YAML files changed, reloading data...');
      this.invalidateCache();
      this.notifyCallbacks();
    });

    this.watcher.on('add', () => {
      this.invalidateCache();
      this.notifyCallbacks();
    });

    this.watcher.on('unlink', () => {
      this.invalidateCache();
      this.notifyCallbacks();
    });
  }

  private invalidateCache() {
    this.cache = null;
    this.questionnaireCache = null;
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback());
  }

  public onDataChange(callback: () => void) {
    this.callbacks.push(callback);
  }

  private loadYamlFileWithNull<T>(filePath: string): T | null {
    try {
      return super.loadYamlFile<T>(this.getDataPath(filePath));
    } catch (error) {
      console.error(`Error loading YAML file ${filePath}:`, error);
      return null;
    }
  }

  protected loadYamlFiles<T>(pattern: string, key: string): T[] {
    try {
      return super.loadYamlFiles<T>(pattern, key);
    } catch (error) {
      console.error(`Error loading YAML files with pattern ${pattern}:`, error);
      return [];
    }
  }

  public async loadGraphData(): Promise<GraphData> {
    if (this.cache) {
      return this.cache;
    }

    console.log('Loading graph data from YAML files...');

    const categories = this.loadYamlFileWithNull<{ categories: AxiomCategory[] }>('categories.yaml')?.categories || [];
    const nodesData = this.loadYamlFileWithNull<{ nodes: Node[] }>('nodes.yaml')?.nodes || [];

    this.cache = {
      categories,
      nodes: nodesData
    };

    console.log(`Loaded ${nodesData.length} nodes, ${categories.length} categories`);
    
    return this.cache;
  }

  public async loadQuestionnaire(): Promise<QuestionnaireItem[]> {
    if (this.questionnaireCache) {
      return this.questionnaireCache;
    }

    // Generate questionnaire from nodes with empty edges (axioms)
    const graphData = await this.loadGraphData();
    const axiomNodes = graphData.nodes.filter(node => node.edges.length === 0);
    
    this.questionnaireCache = axiomNodes.map((node, index) => ({
      id: `q${index + 1}`,
      text: `Do you accept: ${node.title}?`,
      axiomId: node.id,
      category: node.category
    }));
    
    return this.questionnaireCache;
  }

  public async getNodeById(id: string): Promise<Node | null> {
    const data = await this.loadGraphData();
    return data.nodes.find(node => node.id === id) || null;
  }

  public async getAxiomById(id: string): Promise<Axiom | null> {
    const data = await this.loadGraphData();
    const node = data.nodes.find(node => node.id === id && node.edges.length === 0);
    return node as Axiom || null;
  }

  public async getAxiomsByCategory(category: string): Promise<Axiom[]> {
    const data = await this.loadGraphData();
    return data.nodes.filter(node => node.edges.length === 0 && node.category === category) as Axiom[];
  }

  public async getConnectedNodes(nodeId: string): Promise<{ node: Node; direction: 'incoming' | 'outgoing' }[]> {
    const data = await this.loadGraphData();
    const connections: { node: Node; direction: 'incoming' | 'outgoing' }[] = [];

    // Find outgoing connections (this node's edges)
    const sourceNode = data.nodes.find(node => node.id === nodeId);
    if (sourceNode) {
      for (const edge of sourceNode.edges) {
        const targetNode = data.nodes.find(node => node.id === edge.to);
        if (targetNode) {
          connections.push({ 
            node: targetNode, 
            direction: 'outgoing' 
          });
        }
      }
    }

    // Find incoming connections (edges pointing to this node)
    for (const node of data.nodes) {
      for (const edge of node.edges) {
        if (edge.to === nodeId) {
          connections.push({ 
            node, 
            direction: 'incoming' 
          });
        }
      }
    }

    return connections;
  }

  public async addNode(node: Node): Promise<void> {
    // Load existing nodes
    const nodesData = this.loadYamlFileWithNull<{ nodes: Node[] }>('nodes.yaml')?.nodes || [];
    
    // Add the new node
    nodesData.push(node);
    
    // Write back to file
    const yamlContent = YAML.stringify({ nodes: nodesData });
    const filePath = this.getDataPath('nodes.yaml');
    fs.writeFileSync(filePath, yamlContent, 'utf8');
    
    // Invalidate cache
    this.invalidateCache();
  }

  public async deleteNode(nodeId: string): Promise<void> {
    // Load existing nodes
    const nodesData = this.loadYamlFileWithNull<{ nodes: Node[] }>('nodes.yaml')?.nodes || [];
    
    // Remove the node and any edges pointing to it
    const filteredNodes = nodesData
      .filter(node => node.id !== nodeId)
      .map(node => ({
        ...node,
        edges: node.edges.filter(edge => edge.to !== nodeId)
      }));
    
    // Write back to file
    const yamlContent = YAML.stringify({ nodes: filteredNodes });
    const filePath = this.getDataPath('nodes.yaml');
    fs.writeFileSync(filePath, yamlContent, 'utf8');
    
    // Invalidate cache
    this.invalidateCache();
  }

  public close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}