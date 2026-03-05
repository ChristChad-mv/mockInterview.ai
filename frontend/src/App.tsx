/**
 * MockInterview.ai — App Router
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

// Lazy load heavy pages (tldraw alone is ~2MB)
const CodingInterviewPage = lazy(() => import("./pages/CodingInterviewPage"));
const SystemDesignPage = lazy(() => import("./pages/SystemDesignPage"));

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/coding/:problemId" element={<CodingInterviewPage />} />
          <Route path="/system-design/:problemId" element={<SystemDesignPage />} />
          {/* Future routes */}
          {/* <Route path="/behavioral/:questionId" element={<BehavioralPage />} /> */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
