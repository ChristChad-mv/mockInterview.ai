import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0f] text-white p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center text-center max-w-md"
      >
        <h1 className="text-[120px] font-black leading-none bg-gradient-to-b from-blue-400 to-blue-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          404
        </h1>
        
        <h2 className="text-2xl font-bold mt-4 tracking-tight">
          Page not found
        </h2>
        
        <p className="text-gray-400 mt-4 text-balanced leading-relaxed">
          The code for this page doesn't exist yet, or it has been garbage collected. Let's get you back to the session.
        </p>

        <button
          onClick={() => navigate("/")}
          className="mt-10 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20 active:shadow-none"
        >
          Back Home
        </button>
      </motion.div>

      {/* Decorative Small Elements */}
      <div className="absolute bottom-10 left-10 text-[10px] uppercase tracking-[4px] text-gray-700 font-bold rotate-90 origin-left">
        Error Code 0x404
      </div>
      <div className="absolute bottom-10 right-10 text-[10px] uppercase tracking-[4px] text-gray-700 font-bold">
         MockInterview.ai
      </div>
    </div>
  );
}
