import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Code2,
  Mic,
  Eye,
  Zap,
  ArrowRight,
  Terminal,
  Brain,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { problems } from "../data/problems";
import { systemDesignProblems } from "../data/systemDesignProblems";
import { behavioralQuestions } from "../data/behavioralQuestions";

const INTERVIEW_MODES = [
  {
    id: "coding",
    title: "Coding Interview",
    description: "Solve algorithmic problems with a real-time AI interviewer",
    icon: Terminal,
    color: "blue",
    available: true,
    problems: problems,
  },
  {
    id: "system-design",
    title: "System Design",
    description: "Design scalable systems on a whiteboard with guided architecture discussions",
    icon: Brain,
    color: "purple",
    available: true,
    problems: systemDesignProblems,
  },
  {
    id: "behavioral",
    title: "Behavioral",
    description: "Practice STAR method responses with real-time AI feedback and follow-ups",
    icon: MessageSquare,
    color: "green",
    available: true,
    problems: behavioralQuestions,
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Real-time Voice",
    description:
      "Natural conversation with near-zero latency. Powered by Gemini Live native audio.",
  },
  {
    icon: Eye,
    title: "AI Vision",
    description:
      "The interviewer sees your code in real-time and comments on what you write.",
  },
  {
    icon: Code2,
    title: "Full Code Editor",
    description:
      "Monaco editor with syntax highlighting. Python, JavaScript, and Java.",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description:
      "Socratic questioning — guiding hints, never direct answers. Just like a real interview.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState("coding");

  const activeMode = INTERVIEW_MODES.find((m) => m.id === selectedMode)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Animated grid background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Code2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            MockInterview
            <span className="text-blue-400">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/ChristChad-mv/mockInterview.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 mb-8">
            <Zap size={14} />
            Powered by Gemini Live + Google ADK
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl">
            Ace your next
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              technical interview
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
            Practice with an AI interviewer that{" "}
            <span className="text-white font-medium">talks to you</span>,{" "}
            <span className="text-white font-medium">
              watches your code
            </span>{" "}
            in real-time, and gives{" "}
            <span className="text-white font-medium">instant feedback</span> —
            just like a real interview at a top tech company.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
        >
          <a href="#start" className="group">
            <div className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold shadow-xl shadow-blue-500/25 hover:bg-blue-500 hover:shadow-blue-500/40 transition-all cursor-pointer">
              Start Practicing
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16"
        >
          <ChevronDown
            size={24}
            className="text-gray-600 animate-bounce"
          />
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4 group-hover:bg-blue-500/20 transition-colors">
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Interview Mode Selection ── */}
      <section
        id="start"
        className="relative z-10 px-6 py-20 max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Choose your interview type
          </h2>
          <p className="mt-3 text-gray-400">
            Select a mode, pick a problem, and start talking.
          </p>
        </motion.div>

        {/* Mode Tabs */}
        <div className="flex justify-center gap-3 mb-10">
          {INTERVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => mode.available && setSelectedMode(mode.id)}
              className={`relative flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all cursor-pointer ${
                selectedMode === mode.id
                  ? "bg-white/10 text-white border border-white/20 shadow-lg"
                  : mode.available
                    ? "bg-white/[0.03] text-gray-400 border border-white/5 hover:bg-white/[0.06] hover:text-white"
                    : "bg-white/[0.02] text-gray-600 border border-white/5 cursor-not-allowed"
              }`}
            >
              <mode.icon size={18} />
              {mode.title}
              {!mode.available && (
                <span className="text-[10px] uppercase tracking-wider bg-white/10 rounded-full px-2 py-0.5 text-gray-500">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Problem Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMode.available ? (
            activeMode.problems.map((problem, i) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => navigate(`/${activeMode.id}/${problem.id}`)}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors">
                    {problem.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      'difficulty' in problem
                        ? problem.difficulty === "Easy"
                          ? "bg-green-500/15 text-green-400"
                          : problem.difficulty === "Medium"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                        : "bg-purple-500/15 text-purple-400"
                    }`}
                  >
                    {'difficulty' in problem ? problem.difficulty : ('category' in problem ? (problem as any).category : '')}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {problem.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Terminal size={12} />
                  <span>
                    {activeMode.id === 'coding'
                      ? 'Python · JavaScript · Java'
                      : 'category' in problem
                        ? (problem as any).category
                        : 'Whiteboard'}
                  </span>
                </div>
                {/* Hover arrow */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={18} className="text-blue-400" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center py-16 text-gray-500">
              <activeMode.icon size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">Coming soon</p>
              <p className="text-sm mt-1">
                We're building {activeMode.title.toLowerCase()} interviews next.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="relative z-10 px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-6">
            Built with
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            {[
              "Gemini Live 2.5 Flash",
              "Google ADK",
              "Vertex AI",
              "React",
              "Monaco Editor",
              "tldraw",
              "FastAPI",
              "Cloud Run",
              "AudioWorklet",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <span>
            © 2026 MockInterview.ai — Built for the{" "}
            <a
              href="https://googleai.devpost.com/"
              className="text-blue-500 hover:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gemini Live Agent Challenge
            </a>
          </span>
          <a
            href="https://github.com/ChristChad-mv/mockInterview.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
