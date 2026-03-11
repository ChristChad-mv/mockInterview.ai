/**
 * MockInterview.ai — App Router
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Lazy load heavy pages (tldraw alone is ~2MB)
const CodingInterviewPage = lazy(() => import("./pages/CodingInterviewPage"));
const SystemDesignPage = lazy(() => import("./pages/SystemDesignPage"));
const BehavioralPage = lazy(() => import("./pages/BehavioralPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

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

/** Redirect to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/coding/:problemId" element={<RequireAuth><CodingInterviewPage /></RequireAuth>} />
            <Route path="/system-design/:problemId" element={<RequireAuth><SystemDesignPage /></RequireAuth>} />
            <Route path="/behavioral/:questionId" element={<RequireAuth><BehavioralPage /></RequireAuth>} />
            
            {/* Catch All - 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
