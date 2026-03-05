import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageSquare, Lightbulb, Star, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import type {
  AIOverlayItem,
  CodeComment,
  CodeHighlight,
  ApproachSuggestion,
  ProgressRating,
} from "../types/interview";

interface AIOverlayProps {
  items: AIOverlayItem[];
  onDismiss: (id: string) => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: <Info size={12} />,
  },
  warning: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    icon: <AlertTriangle size={12} />,
  },
  error: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: <AlertCircle size={12} />,
  },
  success: {
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-400",
    icon: <CheckCircle size={12} />,
  },
};

const HIGHLIGHT_COLORS: Record<string, string> = {
  blue: "border-blue-500/40 bg-blue-500/5",
  yellow: "border-yellow-500/40 bg-yellow-500/5",
  red: "border-red-500/40 bg-red-500/5",
  green: "border-green-500/40 bg-green-500/5",
};

/** Renders code comment overlays positioned by line number */
const CommentOverlay: React.FC<{ data: CodeComment; onDismiss: () => void }> = ({
  data,
  onDismiss,
}) => {
  const style = SEVERITY_STYLES[data.severity] || SEVERITY_STYLES.info;
  // Each line in Monaco is ~19px, header area ~0px, padding top 16px
  const topOffset = 16 + (data.line - 1) * 19;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`absolute right-4 z-20 flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-md ${style.bg} ${style.border}`}
      style={{ top: `${topOffset}px`, maxWidth: "320px" }}
    >
      <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
      <span className={`text-xs font-medium ${style.text}`}>{data.text}</span>
      <button
        onClick={onDismiss}
        className="ml-1 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={10} className="text-white" />
      </button>
    </motion.div>
  );
};

/** Renders highlight region overlays */
const HighlightOverlay: React.FC<{ data: CodeHighlight; onDismiss: () => void }> = ({
  data,
  onDismiss,
}) => {
  const colorClass = HIGHLIGHT_COLORS[data.color] || HIGHLIGHT_COLORS.blue;
  const topOffset = 16 + (data.startLine - 1) * 19;
  const height = (data.endLine - data.startLine + 1) * 19;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`absolute left-0 right-0 z-10 border-l-2 ${colorClass}`}
      style={{ top: `${topOffset}px`, height: `${height}px` }}
    >
      {data.label && (
        <div className="absolute -top-5 left-12 flex items-center gap-1">
          <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
            {data.label}
          </span>
          <button
            onClick={onDismiss}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={10} className="text-white" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

/** Renders approach suggestion cards */
const SuggestionCard: React.FC<{ data: ApproachSuggestion; onDismiss: () => void }> = ({
  data,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-purple-400" />
          <span className="text-sm font-bold text-purple-300">{data.title}</span>
        </div>
        <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity">
          <X size={12} className="text-white" />
        </button>
      </div>
      <p className="mt-2 text-xs text-purple-200/80">{data.hint}</p>
      {data.complexity && (
        <div className="mt-2 inline-block rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300">
          {data.complexity}
        </div>
      )}
    </motion.div>
  );
};

/** Renders progress rating badges */
const RatingBadge: React.FC<{ data: ProgressRating; onDismiss: () => void }> = ({
  data,
  onDismiss,
}) => {
  const stars = Array.from({ length: 5 }, (_, i) => i < data.score);
  const categoryLabels: Record<string, string> = {
    approach: "Approach",
    code_quality: "Code Quality",
    communication: "Communication",
    edge_cases: "Edge Cases",
    overall: "Overall",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">
            {categoryLabels[data.category] || data.category}
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            {stars.map((filled, i) => (
              <Star
                key={i}
                size={10}
                className={filled ? "text-amber-400 fill-amber-400" : "text-amber-400/20"}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-amber-300/80 max-w-[120px]">{data.feedback}</span>
        <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity">
          <X size={10} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
};

/** Main AI Overlay container — renders all overlay items */
export const AIOverlay: React.FC<AIOverlayProps> = ({ items, onDismiss }) => {
  const comments = items.filter((i): i is { type: "comment"; data: CodeComment } => i.type === "comment");
  const highlights = items.filter((i): i is { type: "highlight"; data: CodeHighlight } => i.type === "highlight");
  const suggestions = items.filter((i): i is { type: "suggestion"; data: ApproachSuggestion } => i.type === "suggestion");
  const ratings = items.filter((i): i is { type: "rating"; data: ProgressRating } => i.type === "rating");

  return (
    <>
      {/* Code highlights (behind everything, full width) */}
      <AnimatePresence>
        {highlights.map((item) => (
          <HighlightOverlay
            key={item.data.id}
            data={item.data}
            onDismiss={() => onDismiss(item.data.id)}
          />
        ))}
      </AnimatePresence>

      {/* Code comments (positioned by line, right side) */}
      <AnimatePresence>
        {comments.map((item) => (
          <CommentOverlay
            key={item.data.id}
            data={item.data}
            onDismiss={() => onDismiss(item.data.id)}
          />
        ))}
      </AnimatePresence>

      {/* Suggestions panel (bottom-left) */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-2 max-w-[300px]">
          <AnimatePresence>
            {suggestions.map((item) => (
              <SuggestionCard
                key={item.data.id}
                data={item.data}
                onDismiss={() => onDismiss(item.data.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Ratings panel (top-right) */}
      {ratings.length > 0 && (
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <AnimatePresence>
            {ratings.map((item) => (
              <RatingBadge
                key={item.data.id}
                data={item.data}
                onDismiss={() => onDismiss(item.data.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};
