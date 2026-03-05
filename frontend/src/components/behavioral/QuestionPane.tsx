/**
 * Question details pane for behavioral interviews.
 * Shows the question, STAR framework guide, and follow-up questions.
 */

import { FC, useState } from 'react';
import { BehavioralQuestion } from '../../data/behavioralQuestions';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Star,
  MessageCircleQuestion,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuestionPaneProps {
  question: BehavioralQuestion;
}

export const QuestionPane: FC<QuestionPaneProps> = ({ question }) => {
  const [showStar, setShowStar] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);

  const categoryColors: Record<string, string> = {
    Leadership: 'bg-blue-500/15 text-blue-400',
    Teamwork: 'bg-green-500/15 text-green-400',
    Conflict: 'bg-red-500/15 text-red-400',
    'Problem-Solving': 'bg-purple-500/15 text-purple-400',
    Adaptability: 'bg-yellow-500/15 text-yellow-400',
    Communication: 'bg-cyan-500/15 text-cyan-400',
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Title & Tags */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-2xl font-black tracking-tight text-white">
            {question.title}
          </h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              categoryColors[question.category] || 'bg-gray-500/15 text-gray-400'
            }`}
          >
            {question.category}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} className="text-gray-500" />
          <span className="text-xs text-gray-500">
            Common at: {question.company}
          </span>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {question.description}
        </p>
      </div>

      {/* STAR Framework Guide */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowStar(!showStar)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {showStar ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <Star size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-white">
            STAR Framework Guide
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            💡 structure your answer
          </span>
        </button>
        <AnimatePresence>
          {showStar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {[
                  {
                    letter: 'S',
                    label: 'Situation',
                    text: question.starMethod.situation,
                    color: 'text-blue-400',
                  },
                  {
                    letter: 'T',
                    label: 'Task',
                    text: question.starMethod.task,
                    color: 'text-green-400',
                  },
                  {
                    letter: 'A',
                    label: 'Action',
                    text: question.starMethod.action,
                    color: 'text-amber-400',
                  },
                  {
                    letter: 'R',
                    label: 'Result',
                    text: question.starMethod.result,
                    color: 'text-purple-400',
                  },
                ].map(({ letter, label, text, color }) => (
                  <div key={letter} className="flex gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black ${color}`}
                    >
                      {letter}
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>
                        {label}
                      </span>
                      <p className="text-sm text-gray-400 mt-0.5">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Follow-up Questions */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowFollowUps(!showFollowUps)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {showFollowUps ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <MessageCircleQuestion size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">
            Possible Follow-ups
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {question.followUps.length} questions
          </span>
        </button>
        <AnimatePresence>
          {showFollowUps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="px-4 pb-4 space-y-2">
                {question.followUps.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <span className="text-cyan-500 mt-0.5 shrink-0">→</span>
                    {q}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
        <h4 className="text-sm font-bold text-amber-400 mb-2">💡 Tips</h4>
        <ul className="space-y-1.5 text-xs text-amber-300/70">
          <li>• Use specific examples, not hypotheticals</li>
          <li>• Quantify results when possible ("reduced by 30%")</li>
          <li>• Keep answers to 2-3 minutes</li>
          <li>• Show self-awareness — what you learned matters</li>
          <li>• The AI interviewer will ask follow-ups, just like a real interview</li>
        </ul>
      </div>
    </div>
  );
};
