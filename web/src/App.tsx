import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/state/AuthProvider";
import { PlatformProvider } from "@/state/PlatformProvider";

import AppCharts from "./pages/app/AppCharts";
import Premium from "./pages/app/Premium";
import ProPredictions from "./pages/app/ProPredictions";
import Today from "./pages/app/Today";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Autopilot from "./pages/dashboard/Autopilot";
import BirdEye from "./pages/dashboard/BirdEye";
import BuildSteps from "./pages/dashboard/BuildSteps";
import CommandCenter from "./pages/dashboard/CommandCenter";
import DnaHunter from "./pages/dashboard/DnaHunter";
import EagleEye from "./pages/dashboard/EagleEye";
import ForecastStudio from "./pages/dashboard/ForecastStudio";
import Ingest from "./pages/dashboard/Ingest";
import Investigation from "./pages/dashboard/Investigation";
import LadderDash from "./pages/dashboard/LadderDash";
import Linguistics from "./pages/dashboard/Linguistics";
import Market from "./pages/dashboard/Market";
import MoonshotFinder from "./pages/dashboard/MoonshotFinder";
import MegaPressureTracker from "./pages/dashboard/MegaPressureTracker";
import MomentoFX from "./pages/dashboard/MomentoFX";
import { MomentoFXDashboard } from "./modules/momentofx-v2";
import PatternDnaTracker from "./pages/dashboard/PatternDnaTracker";
import Resistance from "./pages/dashboard/Resistance";
import RoundTesting from "./pages/dashboard/RoundTesting";
import Settings from "./pages/dashboard/Settings";
import Sources from "./pages/dashboard/Sources";
import Users from "./pages/dashboard/Users";
import Inventory from "./pages/Inventory";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Orchestrator from "./pages/Orchestrator";

// React Query is the top-level provider; every other provider nests inside it.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlatformProvider>
        <TooltipProvider delayDuration={300}>
          <Toaster position="top-right" />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* consumer app */}
              <Route path="/app" element={<Today />} />
              <Route path="/app/pro" element={<ProPredictions />} />
              <Route path="/app/charts" element={<AppCharts />} />
              <Route path="/app/premium" element={<Premium />} />

              {/* operator console */}
              <Route path="/dashboard" element={<CommandCenter />} />
              <Route path="/dashboard/market" element={<Market />} />
              <Route path="/dashboard/ladder" element={<LadderDash />} />
              <Route path="/dashboard/resistance" element={<Resistance />} />
              <Route path="/dashboard/moonshot" element={<MoonshotFinder />} />
              <Route path="/dashboard/dna" element={<DnaHunter />} />
              <Route path="/dashboard/mega-pressure" element={<MegaPressureTracker />} />
              <Route path="/dashboard/momento-fx" element={<MomentoFX />} />
              <Route path="/dashboard/momento-fx-v2" element={<MomentoFXDashboard />} />
              <Route path="/dashboard/pattern-dna" element={<PatternDnaTracker />} />
              <Route path="/dashboard/studio" element={<ForecastStudio />} />
              <Route path="/dashboard/ingest" element={<Ingest />} />
              <Route path="/dashboard/investigation" element={<Investigation />} />
              <Route path="/dashboard/eagle-eye" element={<EagleEye />} />
              <Route path="/dashboard/sources" element={<Sources />} />
              <Route path="/dashboard/birdeye" element={<BirdEye />} />
              <Route path="/dashboard/build-steps" element={<BuildSteps />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/users" element={<Users />} />
              <Route path="/dashboard/testing" element={<RoundTesting />} />

              {/* cross-cutting surfaces */}
              <Route path="/orchestrator" element={<Orchestrator />} />
              <Route path="/inventory" element={<Inventory />} />

              {/* legacy route aliases from the original AVFS dashboards */}
              <Route path="/dashboard/charts" element={<Navigate to="/dashboard/market" replace />} />
              <Route path="/dashboard/crash-studio" element={<Navigate to="/dashboard/studio" replace />} />
              <Route path="/dashboard/login" element={<Navigate to="/login" replace />} />
              <Route path="/app/auth" element={<Navigate to="/login" replace />} />
              <Route path="/market" element={<Navigate to="/dashboard/market" replace />} />
              <Route path="/ladder-resistance" element={<Navigate to="/dashboard/resistance" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PlatformProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
