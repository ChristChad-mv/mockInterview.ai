import { motion } from "motion/react";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-blue-500/30">
      {/* ── Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 p-8">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: March 10, 2026</p>
          </header>

          <section className="space-y-6 prose prose-invert max-w-none">
            <p className="text-gray-400 leading-relaxed">
              Your privacy is fundamental to our mission. At MockInterview.ai, we believe your interview preparation data is yours alone.
            </p>

            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Lock size={18} className="text-blue-500" /> 
                Voice and Video Data
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                During interview sessions, we process audio and visual inputs in real-time to provide feedback. 
                <span className="text-white font-medium"> We do not store your raw audio or video files permanently</span> unless you explicitly choose to save a recording for your own review.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold">1. Information we collect</h2>
              <ul className="list-disc pl-5 text-gray-400 text-sm space-y-2">
                <li>Email address for waitlist and account management.</li>
                <li>Performance metrics (scores, types of problems solved).</li>
                <li>Browser metadata to optimize the real-time agent experience.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold">2. How we use your data</h2>
              <p className="text-gray-400 text-sm">
                We use your data strictly to improve the AI's feedback accuracy and provide you with progress tracking. We never sell your personal information to third parties.
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
