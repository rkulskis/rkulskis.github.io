import { GraphData, QuestionnaireItem, UserSession, Axiom, Node } from '@philsaxioms/shared';
import { BrowserHttpClient } from './browser-http-client';
import staticClient from '../api/static-client';

const API_BASE = '/api';
const isStaticDeployment = !import.meta.env.DEV;

export class ApiClient {
  private httpClient: BrowserHttpClient;
  private graphDataCache: GraphData | null = null;
  private questionnaireCache: QuestionnaireItem[] | null = null;

  constructor() {
    this.httpClient = new BrowserHttpClient(API_BASE);
    // Preload data in the background for faster access
    this.preloadData();
  }

  private async preloadData() {
    try {
      // Start preloading graph data immediately
      if (isStaticDeployment) {
        // Preload static data
        staticClient.getGraphData().then(data => this.graphDataCache = data);
        staticClient.getQuestionnaire().then(data => this.questionnaireCache = data);
      }
    } catch (error) {
      // Silently fail - data will be loaded on demand
      console.debug('Preload failed:', error);
    }
  }

  async fetchGraphData(): Promise<GraphData> {
    // Return cached data if available for static deployment
    if (isStaticDeployment && this.graphDataCache) {
      return this.graphDataCache;
    }
    
    if (isStaticDeployment) {
      const data = await staticClient.getGraphData();
      this.graphDataCache = data;
      return data;
    }
    
    return this.httpClient.get<GraphData>('/graph');
  }

  async fetchQuestionnaire(): Promise<QuestionnaireItem[]> {
    // Return cached data if available for static deployment
    if (isStaticDeployment && this.questionnaireCache) {
      return this.questionnaireCache;
    }
    
    if (isStaticDeployment) {
      try {
        const data = await staticClient.getQuestionnaire();
        this.questionnaireCache = data;
        return data;
      } catch (error) {
        console.error('Error loading questionnaire from static client:', error);
        // If static client fails, try to reload data
        throw new Error('Failed to load questionnaire. Please refresh the page.');
      }
    }
    
    return this.httpClient.get<QuestionnaireItem[]>('/questionnaire');
  }

  async fetchAxiom(id: string): Promise<Axiom> {
    return this.httpClient.get<Axiom>(`/axioms/${id}`);
  }

  async fetchAxiomConnections(id: string): Promise<{ axiom: Axiom; edge: any; direction: 'incoming' | 'outgoing' }[]> {
    return this.httpClient.get<{ axiom: Axiom; edge: any; direction: 'incoming' | 'outgoing' }[]>(`/axioms/${id}/connections`);
  }

  async createSession(acceptedAxioms: string[] = [], rejectedAxioms: string[] = []): Promise<UserSession> {
    if (isStaticDeployment) {
      return await staticClient.createSession(acceptedAxioms, rejectedAxioms);
    }
    
    return this.httpClient.post<UserSession>('/sessions', { acceptedAxioms, rejectedAxioms });
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession> {
    if (isStaticDeployment) {
      return await staticClient.updateSession(sessionId, updates);
    }
    
    return this.httpClient.put<UserSession>(`/sessions/${sessionId}`, updates);
  }

  async fetchSession(sessionId: string): Promise<UserSession> {
    if (isStaticDeployment) {
      return await staticClient.fetchSession(sessionId);
    }
    
    return this.httpClient.get<UserSession>(`/sessions/${sessionId}`);
  }

  async createSnapshot(sessionId: string, title: string, description?: string, isPublic: boolean = false): Promise<any> {
    if (isStaticDeployment) {
      return await staticClient.createSnapshot(sessionId, title, description || '', isPublic);
    }
    
    return this.httpClient.post<any>('/snapshots', { sessionId, title, description, isPublic });
  }

  async fetchSnapshot(snapshotId: string): Promise<any> {
    return this.httpClient.get<any>(`/snapshots/${snapshotId}`);
  }

  async fetchPublicSnapshots(): Promise<any[]> {
    return this.httpClient.get<any[]>('/snapshots');
  }

  async createNode(node: Node): Promise<{ message: string; node: Node }> {
    if (isStaticDeployment) {
      throw new Error('Node creation is not available in static deployment');
    }
    
    return this.httpClient.post<{ message: string; node: Node }>('/nodes', node);
  }

  async deleteNode(nodeId: string): Promise<{ message: string }> {
    if (isStaticDeployment) {
      throw new Error('Node deletion is not available in static deployment');
    }
    
    return this.httpClient.delete<{ message: string }>(`/nodes/${nodeId}`);
  }
}

export const apiClient = new ApiClient();