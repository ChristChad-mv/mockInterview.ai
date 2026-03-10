import { motion } from "motion/react";
import { ArrowLeft, Scale, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-blue-500/30">
      {/* ── Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
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
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Scale size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Terms of Service</h1>
            <p className="text-gray-500 text-sm">Last updated: March 10, 2026</p>
          </header>

          <section className="space-y-6 prose prose-invert max-w-none">
            <p className="text-gray-400 leading-relaxed">
              Welcome to MockInterview.ai. By using our platform, you agree to these simplified terms.
            </p>

            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText size={18} className="text-purple-500" /> 
                Acceptance of Terms
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                By accessing our beta platform, you acknowledge that the service is provided "as is" and intended for educational and practice purposes only.
              </p>
            </div>

            <div className="space-y-4 border-l-2 border-white/5 pl-6 py-2">
              <h3 className="font-bold text-lg italic text-white/80">Prohibited Conduct</h3>
              <p className="text-gray-400 text-sm">
                Users may not use the agent to generate malicious content, reverse engineer the platform, or attempt to disrupt the real-time websocket connections.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold">1. Beta Nature</h2>
              <p className="text-gray-400 text-sm">
                MockInterview.ai is currently in active development. Features may change, and service may be interrupted for maintenance. We appreciate your feedback during this period.
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
