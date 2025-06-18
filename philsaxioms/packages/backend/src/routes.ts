import { Router } from 'express';
import { YamlDataLoader } from './yaml-loader';
import { UserSession, generateSessionId, generateSnapshotId, Node } from '@philsaxioms/shared';
import { ResponseHandler } from './utils/response-handler';

export function createRoutes(dataLoader: YamlDataLoader): Router {
  const router = Router();

  // Get all graph data (axioms, edges, categories)
  router.get('/api/graph', ResponseHandler.createDataRoute(
    () => dataLoader.loadGraphData(),
    'Failed to load graph data'
  ));

  // Get questionnaire items
  router.get('/api/questionnaire', ResponseHandler.createDataRoute(
    () => dataLoader.loadQuestionnaire(),
    'Failed to load questionnaire'
  ));

  // Get specific axiom by ID
  router.get('/api/axioms/:id', ResponseHandler.createFindByIdRoute(
    (id: string) => dataLoader.getAxiomById(id),
    'Failed to load axiom',
    'Axiom not found'
  ));

  // Get axioms by category
  router.get('/api/axioms/category/:category', ResponseHandler.wrapAsyncRoute(async (req, res) => {
    const axioms = await dataLoader.getAxiomsByCategory(req.params.category);
    ResponseHandler.handleSuccess(res, axioms);
  }));

  // Get connected nodes (axioms or arguments)
  router.get('/api/nodes/:id/connections', ResponseHandler.wrapAsyncRoute(async (req, res) => {
    const connections = await dataLoader.getConnectedNodes(req.params.id);
    ResponseHandler.handleSuccess(res, connections);
  }));

  // Create new node (axiom or argument)
  router.post('/api/nodes', ResponseHandler.wrapAsyncRoute(async (req, res) => {
    const nodeData = req.body as Node;
    
    // Validate required fields
    if (!nodeData.id || !nodeData.title || !nodeData.description) {
      return res.status(400).json({ error: 'Missing required fields: id, title, description' });
    }

    // Check if node with this ID already exists
    const existingNode = await dataLoader.getNodeById(nodeData.id);
    if (existingNode) {
      return res.status(409).json({ error: 'Node with this ID already exists' });
    }

    await dataLoader.addNode(nodeData);
    ResponseHandler.handleSuccess(res, { message: 'Node created successfully', node: nodeData });
  }));

  // Delete node by ID
  router.delete('/api/nodes/:id', ResponseHandler.wrapAsyncRoute(async (req, res) => {
    const nodeId = req.params.id;
    
    // Check if node exists
    const existingNode = await dataLoader.getNodeById(nodeId);
    if (!existingNode) {
      return res.status(404).json({ error: 'Node not found' });
    }

    await dataLoader.deleteNode(nodeId);
    ResponseHandler.handleSuccess(res, { message: 'Node deleted successfully' });
  }));

  // Get specific argument by ID
  router.get('/api/arguments/:id', ResponseHandler.createFindByIdRoute(
    async (id: string) => {
      const data = await dataLoader.loadGraphData();
      const argument = data.nodes.find(node => node.id === id && node.edges.length > 0);
      return argument || null;
    },
    'Failed to load argument',
    'Argument not found'
  ));

  // Simple in-memory storage (replace with database in production)
  const sessions = new Map<string, UserSession>();
  const snapshots = new Map<string, any>();

  // Create new user session
  router.post('/api/sessions', (req, res) => {
    const { acceptedAxioms = [], rejectedAxioms = [] } = req.body;
    
    const session: UserSession = {
      id: generateSessionId(),
      acceptedAxioms,
      rejectedAxioms,
      exploredConnections: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    sessions.set(session.id, session);
    res.json(session);
  });

  // Get session by ID
  router.get('/api/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  });

  // Update session
  router.put('/api/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { acceptedAxioms, rejectedAxioms, exploredConnections } = req.body;
    
    if (acceptedAxioms) session.acceptedAxioms = acceptedAxioms;
    if (rejectedAxioms) session.rejectedAxioms = rejectedAxioms;
    if (exploredConnections) session.exploredConnections = exploredConnections;
    
    session.updatedAt = new Date();
    sessions.set(session.id, session);
    
    res.json(session);
  });

  // Create snapshot
  router.post('/api/snapshots', async (req, res) => {
    try {
      const { title, description, sessionId, isPublic = false } = req.body;
      const session = sessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const data = await dataLoader.loadGraphData();
      const relevantAxioms = session.acceptedAxioms;
      const relevantNodes = data.nodes.filter(node => 
        node.edges.length === 0 && relevantAxioms.includes(node.id)
      );

      const snapshot = {
        id: generateSnapshotId(),
        title,
        description,
        axioms: relevantAxioms,
        nodes: relevantNodes.map(n => n.id),
        metadata: {
          isPublic,
          createdBy: sessionId,
        },
        createdAt: new Date(),
      };

      snapshots.set(snapshot.id, snapshot);
      res.json(snapshot);
    } catch (error) {
      console.error('Error creating snapshot:', error);
      res.status(500).json({ error: 'Failed to create snapshot' });
    }
  });

  // Get snapshot by ID
  router.get('/api/snapshots/:id', async (req, res) => {
    try {
      const snapshot = snapshots.get(req.params.id);
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }

      const data = await dataLoader.loadGraphData();
      const snapshotNodes = data.nodes.filter(node => 
        snapshot.nodes ? snapshot.nodes.includes(node.id) : snapshot.axioms.includes(node.id)
      );

      res.json({
        ...snapshot,
        nodeData: snapshotNodes,
        categories: data.categories,
      });
    } catch (error) {
      console.error('Error loading snapshot:', error);
      res.status(500).json({ error: 'Failed to load snapshot' });
    }
  });

  // List public snapshots
  router.get('/api/snapshots', (req, res) => {
    const publicSnapshots = Array.from(snapshots.values())
      .filter(snapshot => snapshot.metadata?.isPublic)
      .map(snapshot => ({
        id: snapshot.id,
        title: snapshot.title,
        description: snapshot.description,
        createdAt: snapshot.createdAt,
        nodeCount: snapshot.nodes ? snapshot.nodes.length : snapshot.axioms ? snapshot.axioms.length : 0,
      }));
    
    res.json(publicSnapshots);
  });

  // Health check
  router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}