import { GraphData, QuestionnaireItem, UserSession } from '@philsaxioms/shared';
import { BrowserHttpClient } from '../utils/browser-http-client';
import { generateSessionId, generateSnapshotId } from '../utils/id-generator';

class StaticApiClient {
  private graphDataCache: GraphData | null = null;
  private questionnaireCache: QuestionnaireItem[] | null = null;
  private httpClient: BrowserHttpClient;

  constructor() {
    // Use relative paths when served from philsaxioms subdirectory, absolute for GitHub Pages
    const isGitHubPages = window.location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/philsaxioms' : '.';
    this.httpClient = new BrowserHttpClient(basePath);
  }

  async getGraphData(): Promise<GraphData> {
    if (this.graphDataCache) {
      return this.graphDataCache;
    }

    try {
      this.graphDataCache = await this.httpClient.get<GraphData>('/graph-data.json');
      return this.graphDataCache;
    } catch (error) {
      console.error('Error loading graph data:', error);
      throw error;
    }
  }

  async getQuestionnaire(): Promise<QuestionnaireItem[]> {
    if (this.questionnaireCache) {
      return this.questionnaireCache;
    }

    try {
      this.questionnaireCache = await this.httpClient.get<QuestionnaireItem[]>('/questionnaire.json');
      return this.questionnaireCache;
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      throw error;
    }
  }

  async createSession(acceptedAxioms: string[] = [], rejectedAxioms: string[] = []): Promise<UserSession> {
    // Generate a client-side session with the provided axioms
    const session: UserSession = {
      id: generateSessionId(),
      acceptedAxioms,
      rejectedAxioms,
      createdAt: new Date(),
    };
    
    // Store the session in localStorage
    this.storeSession(session);
    
    return session;
  }

  async fetchSession(sessionId: string): Promise<UserSession> {
    // Fetch session from localStorage
    try {
      return this.getStoredSession(sessionId);
    } catch (error) {
      // Return default session if not found
      return {
        id: sessionId,
        acceptedAxioms: [],
        rejectedAxioms: [],
        createdAt: new Date(),
      };
    }
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession> {
    // For static deployment, we'll just return the updated session
    // In a real static app, you might save to localStorage
    try {
      const stored = this.getStoredSession(sessionId);
      const updated = { ...stored, ...updates };
      this.storeSession(updated);
      return updated;
    } catch (error) {
      // If session doesn't exist, create a new one with the updates
      const newSession: UserSession = {
        id: sessionId,
        acceptedAxioms: [],
        rejectedAxioms: [],
        createdAt: new Date(),
        ...updates
      };
      this.storeSession(newSession);
      return newSession;
    }
  }

  async createSnapshot(
    sessionId: string,
    title: string,
    description: string,
    isPublic: boolean
  ): Promise<{ id: string; url: string }> {
    // For static deployment, we'll generate a simple snapshot
    const snapshotId = generateSnapshotId();
    const session = this.getStoredSession(sessionId);
    
    // Store snapshot in localStorage
    const snapshot = {
      id: snapshotId,
      title,
      description,
      isPublic,
      session,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`snapshot_${snapshotId}`, JSON.stringify(snapshot));
    
    // Generate URL based on current location
    const currentPath = window.location.pathname;
    const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    
    return {
      id: snapshotId,
      url: `${window.location.origin}${basePath}?snapshot=${snapshotId}`,
    };
  }


  private getStoredSession(sessionId: string): UserSession {
    const stored = localStorage.getItem(`session_${sessionId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored session:', error);
        throw new Error('Invalid session data');
      }
    }
    
    // Throw error if session not found - let the caller handle it
    throw new Error(`Session ${sessionId} not found`);
  }

  private storeSession(session: UserSession): void {
    localStorage.setItem(`session_${session.id}`, JSON.stringify(session));
  }
}

export default new StaticApiClient();