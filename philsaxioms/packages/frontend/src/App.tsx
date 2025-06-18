import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DesktopOnlyWrapper from './components/DesktopOnlyWrapper';
import { useGraphData } from './hooks/useGraphData';
import { apiClient } from './utils/api';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { UserSession } from '@philsaxioms/shared';

// Lazy load heavy components
const Questionnaire = lazy(() => import('./components/Questionnaire'));
const GraphView = lazy(() => import('./components/GraphView'));

function App() {
  const { data: graphData, loading, error } = useGraphData();
  
  const [session, setSession] = useState<UserSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const navigate = useNavigate();

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      const storedSessionId = localStorage.getItem('philsaxioms_session_id');
      if (storedSessionId) {
        try {
          // Try to fetch the session from the server
          const existingSession = await apiClient.fetchSession(storedSessionId);
          setSession(existingSession);
        } catch (error) {
          console.error('Failed to load session:', error);
          // Session not found, clear localStorage
          localStorage.removeItem('philsaxioms_session_id');
        }
      }
      setSessionLoading(false);
    };
    
    loadSession();
  }, []);

  const handleQuestionnaireComplete = async (acceptedAxioms: string[], rejectedAxioms: string[]) => {
    try {
      const newSession = await apiClient.createSession(acceptedAxioms, rejectedAxioms);
      console.log('Session created:', newSession);
      
      // Store session ID in localStorage
      localStorage.setItem('philsaxioms_session_id', newSession.id);
      
      // Set session state and navigate in sequence
      setSession(newSession);
      
      // Wait for state to update before navigating
      setTimeout(() => {
        navigate('/explore');
      }, 100);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSkipQuestionnaire = async () => {
    try {
      // Create a session with no accepted/rejected axioms
      const newSession = await apiClient.createSession([], []);
      console.log('Empty session created for exploration:', newSession);
      
      // Store session ID in localStorage
      localStorage.setItem('philsaxioms_session_id', newSession.id);
      
      // Set session state and navigate in sequence
      setSession(newSession);
      
      // Wait for state to update before navigating
      setTimeout(() => {
        navigate('/explore');
      }, 100);
    } catch (error) {
      console.error('Failed to create empty session:', error);
    }
  };

  const handleSessionUpdate = async (updates: Partial<UserSession>) => {
    if (!session) return;
    
    try {
      const updatedSession = await apiClient.updateSession(session.id, updates);
      setSession(updatedSession);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner message="Loading PhilsAxioms..." size="lg" />
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Error Loading Data</h1>
          <p className="text-red-600">{error || 'Failed to load graph data'}</p>
        </div>
      </div>
    );
  }

  return (
    <DesktopOnlyWrapper>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<LoadingSpinner message="Loading questionnaire..." size="lg" />}>
                <Questionnaire
                  onComplete={handleQuestionnaireComplete}
                  onSkip={handleSkipQuestionnaire}
                  categories={graphData.categories}
                />
              </Suspense>
            }
          />
          <Route
            path="/explore"
            element={
              !graphData ? (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading graph data...</p>
                  </div>
                </div>
              ) : !session && !sessionLoading ? (
                // Only redirect if session loading is complete and no session exists
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">No session found. Creating new session...</p>
                    {(() => {
                      // Auto-create session if none exists
                      handleSkipQuestionnaire();
                      return null;
                    })()}
                  </div>
                </div>
              ) : !session ? (
                // Still loading session
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading session...</p>
                  </div>
                </div>
              ) : (
                <Suspense fallback={<LoadingSpinner message="Loading graph visualization..." size="lg" />}>
                  <GraphView
                    nodes={graphData.nodes}
                    categories={graphData.categories}
                    session={session}
                    onSessionUpdate={handleSessionUpdate}
                  />
                </Suspense>
              )
            }
          />
        </Routes>
      </div>
    </DesktopOnlyWrapper>
  );
}

export default App;