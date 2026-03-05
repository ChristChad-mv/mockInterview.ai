/**
 * Requirements pane for system design interviews.
 * Shows problem description, functional/non-functional requirements, hints.
 */

import { FC, useState } from 'react';
import { SystemDesignProblem } from '../../data/systemDesignProblems';
import { ChevronDown, ChevronRight, Lightbulb, CheckCircle2, AlertTriangle, Boxes } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RequirementsPaneProps {
  problem: SystemDesignProblem;
}

export const RequirementsPane: FC<RequirementsPaneProps> = ({ problem }) => {
  const [showHints, setShowHints] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    functional: true,
    nonFunctional: true,
    components: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Title & Difficulty */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-2xl font-black tracking-tight text-white">
            {problem.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                problem.difficulty === 'Medium'
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {problem.difficulty}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400">
              {problem.category}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </p>
      </div>

      {/* Functional Requirements */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => toggleSection('functional')}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {expandedSections.functional ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-sm font-semibold text-white">
            Functional Requirements
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {problem.requirements.functional.length} items
          </span>
        </button>
        <AnimatePresence>
          {expandedSections.functional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="px-4 pb-4 space-y-2">
                {problem.requirements.functional.map((req, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <span className="text-green-500 mt-0.5 shrink-0">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Non-Functional Requirements */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => toggleSection('nonFunctional')}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {expandedSections.nonFunctional ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold text-white">
            Non-Functional Requirements
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {problem.requirements.nonFunctional.length} items
          </span>
        </button>
        <AnimatePresence>
          {expandedSections.nonFunctional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="px-4 pb-4 space-y-2">
                {problem.requirements.nonFunctional.map((req, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Components */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => toggleSection('components')}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {expandedSections.components ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          <Boxes size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">
            Key Components
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            💡 reveal after designing
          </span>
        </button>
        <AnimatePresence>
          {expandedSections.components && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {problem.keyComponents.map((component) => (
                  <span
                    key={component}
                    className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400"
                  >
                    {component}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hints */}
      <div>
        <button
          onClick={() => setShowHints(!showHints)}
          className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <Lightbulb size={16} />
          <span className="font-medium">
            {showHints ? 'Hide hints' : 'Show hints (try without first!)'}
          </span>
        </button>
        <AnimatePresence>
          {showHints && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="mt-3 space-y-2 pl-1">
                {problem.hints.map((hint, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-amber-300/70"
                  >
                    <span className="text-amber-500 mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
                    {hint}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
