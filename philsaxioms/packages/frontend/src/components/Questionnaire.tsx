import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { QuestionnaireItem, AxiomCategory, UserSession } from '@philsaxioms/shared';
import { apiClient } from '../utils/api';

interface QuestionnaireProps {
  onComplete: (acceptedAxioms: string[], rejectedAxioms: string[]) => void;
  onSkip: () => void;
  categories: AxiomCategory[];
  existingSession?: UserSession | null;
}

export default function Questionnaire({ onComplete, onSkip, categories, existingSession }: QuestionnaireProps) {
  const [questions, setQuestions] = useState<QuestionnaireItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuestionnaire() {
      try {
        const questionnaire = await apiClient.fetchQuestionnaire();
        setQuestions(questionnaire);
        
        // Pre-fill answers if there's an existing session
        if (existingSession) {
          const prefilledAnswers: Record<string, boolean> = {};
          questionnaire.forEach(q => {
            if (existingSession.acceptedAxioms.includes(q.axiomId)) {
              prefilledAnswers[q.axiomId] = true;
            } else if (existingSession.rejectedAxioms.includes(q.axiomId)) {
              prefilledAnswers[q.axiomId] = false;
            }
          });
          setAnswers(prefilledAnswers);
        }
      } catch (error) {
        console.error('Failed to load questionnaire:', error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestionnaire();
  }, [existingSession]);

  const currentQuestion = questions[currentIndex];
  const category = categories.find(c => c.id === currentQuestion?.category);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (accept: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.axiomId]: accept
    }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const accepted = Object.entries(answers)
        .filter(([_, value]) => value)
        .map(([axiomId]) => axiomId);
      
      const rejected = Object.entries(answers)
        .filter(([_, value]) => !value)
        .map(([axiomId]) => axiomId);

      if (currentQuestion.axiomId) {
        if (accept) {
          accepted.push(currentQuestion.axiomId);
        } else {
          rejected.push(currentQuestion.axiomId);
        }
      }

      onComplete(accepted, rejected);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading philosophical axioms...</p>
        </div>
      </div>
    );
  }

  // Handle empty questionnaire - show welcome screen with option to skip
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">PhilsAxioms</h1>
          <p className="text-gray-600 mb-8">
            Welcome to the interactive philosophical axiom explorer.
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Ready to Explore
            </h2>
            <p className="text-gray-600 mb-6">
              No questionnaire items are currently available. You can proceed directly to explore the philosophical framework.
            </p>
            <button
              onClick={onSkip}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Error loading questionnaire</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header with skip option */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">PhilsAxioms</h1>
          <p className="text-gray-600 mb-4">
            {existingSession 
              ? "Review and modify your philosophical framework" 
              : "Build your philosophical framework by answering these foundational questions"
            }
          </p>
          <button
            onClick={onSkip}
            className="text-indigo-600 hover:text-indigo-800 underline text-sm"
          >
            {existingSession 
              ? "Continue with current framework →" 
              : "Skip questionnaire and explore all axioms →"
            }
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-indigo-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-xl p-8"
          >
            {/* Category badge */}
            {category && (
              <div 
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-4"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </div>
            )}

            {/* Question */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentQuestion.text}
            </h2>

            {/* Description */}
            {currentQuestion.description && (
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                {currentQuestion.description}
              </p>
            )}

            {/* Answer buttons */}
            <div className="flex gap-4 mb-6">
              <motion.button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check className="w-5 h-5" />
                Yes, I accept this
              </motion.button>

              <motion.button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-5 h-5" />
                No, I reject this
              </motion.button>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={goBack}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-gray-400">
                {currentIndex < questions.length - 1 ? 'Continue' : 'Finish'} 
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}