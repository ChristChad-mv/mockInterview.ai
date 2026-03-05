import { FC } from 'react';
import { Problem } from '../../data/problems';
import { motion } from 'motion/react';

interface ProblemPaneProps {
  problem: Problem;
}

export const ProblemPane: FC<ProblemPaneProps> = ({ problem }) => {
  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{problem.title}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
            problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="max-w-none">
          <p className="whitespace-pre-wrap text-gray-300">{problem.description}</p>
          
          <h3 className="mt-6 text-lg font-semibold text-white">Examples</h3>
          <div className="space-y-4 mt-3">
            {problem.examples.map((example, index) => (
              <div key={index} className="rounded-lg bg-black/30 p-4">
                <div className="mb-2">
                  <span className="font-mono text-sm font-semibold text-gray-400">Input:</span>
                  <code className="ml-2 font-mono text-sm text-white">{example.input}</code>
                </div>
                <div>
                  <span className="font-mono text-sm font-semibold text-gray-400">Output:</span>
                  <code className="ml-2 font-mono text-sm text-white">{example.output}</code>
                </div>
                {example.explanation && (
                  <div className="mt-2 text-sm text-gray-400">
                    <span className="font-semibold">Explanation:</span> {example.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
