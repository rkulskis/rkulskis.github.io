import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createRoutes } from '../routes';
import { YamlDataLoader } from '../yaml-loader';

// Mock the YamlDataLoader
const mockDataLoader = {
  loadGraphData: vi.fn(),
  loadQuestionnaire: vi.fn(),
  getAxiomById: vi.fn(),
  getAxiomsByCategory: vi.fn(),
  getConnectedNodes: vi.fn(),
  close: vi.fn(),
} as any;

const mockGraphData = {
  axioms: [
    {
      id: 'test-axiom-1',
      title: 'Test Axiom 1',
      description: 'This is a test axiom',
      category: 'ethics',
    },
  ],
  arguments: [
    {
      id: 'test-argument-1',
      title: 'Test Argument 1',
      description: 'This is a test argument',
      conclusion: 'Test conclusion',
      category: 'ethics',
      level: 1,
    },
  ],
  edges: [
    {
      id: 'test-edge-1',
      fromNode: 'test-axiom-1',
      toNode: 'test-argument-1',
      fromType: 'axiom',
      toType: 'argument',
      relation: { type: 'supports', strength: 0.8 },
      explanation: 'Test explanation',
    },
  ],
  categories: [
    {
      id: 'ethics',
      name: 'Ethics',
      color: '#EF4444',
      description: 'Moral principles',
    },
  ],
};

const mockQuestionnaire = [
  {
    axiomId: 'test-axiom-1',
    question: 'Do you accept this test axiom?',
    explanation: 'This is for testing',
    category: 'ethics',
  },
];

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(createRoutes(mockDataLoader));

    // Setup default mocks
    mockDataLoader.loadGraphData.mockResolvedValue(mockGraphData);
    mockDataLoader.loadQuestionnaire.mockResolvedValue(mockQuestionnaire);
    mockDataLoader.getAxiomById.mockResolvedValue(mockGraphData.axioms[0]);
    mockDataLoader.getAxiomsByCategory.mockResolvedValue([mockGraphData.axioms[0]]);
    mockDataLoader.getConnectedNodes.mockResolvedValue([]);
  });

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /api/graph', () => {
    it('returns graph data', async () => {
      const response = await request(app)
        .get('/api/graph')
        .expect(200);

      expect(response.body).toEqual(mockGraphData);
      expect(mockDataLoader.loadGraphData).toHaveBeenCalledOnce();
    });

    it('handles errors gracefully', async () => {
      mockDataLoader.loadGraphData.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/graph')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to load graph data',
      });
    });
  });

  describe('GET /api/questionnaire', () => {
    it('returns questionnaire data', async () => {
      const response = await request(app)
        .get('/api/questionnaire')
        .expect(200);

      expect(response.body).toEqual(mockQuestionnaire);
      expect(mockDataLoader.loadQuestionnaire).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/axioms/:id', () => {
    it('returns specific axiom', async () => {
      const response = await request(app)
        .get('/api/axioms/test-axiom-1')
        .expect(200);

      expect(response.body).toEqual(mockGraphData.axioms[0]);
      expect(mockDataLoader.getAxiomById).toHaveBeenCalledWith('test-axiom-1');
    });

    it('returns 404 for non-existent axiom', async () => {
      mockDataLoader.getAxiomById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/axioms/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Axiom not found',
      });
    });
  });

  describe('GET /api/arguments/:id', () => {
    it('returns specific argument', async () => {
      const response = await request(app)
        .get('/api/arguments/test-argument-1')
        .expect(200);

      expect(response.body).toEqual(mockGraphData.arguments[0]);
      expect(mockDataLoader.loadGraphData).toHaveBeenCalledOnce();
    });

    it('returns 404 for non-existent argument', async () => {
      const response = await request(app)
        .get('/api/arguments/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Argument not found',
      });
    });
  });

  describe('POST /api/sessions', () => {
    it('creates new session', async () => {
      const sessionData = {
        acceptedAxioms: ['test-axiom-1'],
        rejectedAxioms: [],
      };

      const response = await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        acceptedAxioms: ['test-axiom-1'],
        rejectedAxioms: [],
        exploredConnections: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('creates session with default empty arrays', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        acceptedAxioms: [],
        rejectedAxioms: [],
      });
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('retrieves existing session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({ acceptedAxioms: ['test-axiom-1'] });

      const sessionId = createResponse.body.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: sessionId,
        acceptedAxioms: ['test-axiom-1'],
      });
    });

    it('returns 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/sessions/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Session not found',
      });
    });
  });

  describe('PUT /api/sessions/:id', () => {
    it('updates existing session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({ acceptedAxioms: ['test-axiom-1'] });

      const sessionId = createResponse.body.id;

      // Then update it
      const updateData = {
        acceptedAxioms: ['test-axiom-1', 'test-axiom-2'],
        rejectedAxioms: ['test-axiom-3'],
      };

      const response = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: sessionId,
        acceptedAxioms: ['test-axiom-1', 'test-axiom-2'],
        rejectedAxioms: ['test-axiom-3'],
        updatedAt: expect.any(String),
      });
    });
  });

  describe('POST /api/snapshots', () => {
    it('creates snapshot from session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({ acceptedAxioms: ['test-axiom-1'] });

      const sessionId = createResponse.body.id;

      // Then create a snapshot
      const snapshotData = {
        title: 'Test Snapshot',
        description: 'A test snapshot',
        sessionId,
        isPublic: true,
      };

      const response = await request(app)
        .post('/api/snapshots')
        .send(snapshotData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'Test Snapshot',
        description: 'A test snapshot',
        axioms: ['test-axiom-1'],
        createdAt: expect.any(String),
      });
    });

    it('returns 404 for non-existent session', async () => {
      const snapshotData = {
        title: 'Test Snapshot',
        sessionId: 'non-existent',
      };

      const response = await request(app)
        .post('/api/snapshots')
        .send(snapshotData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Session not found',
      });
    });
  });
});