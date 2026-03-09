import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import SetupPage from "./pages/SetupPage";
import TestPage from "./pages/TestPage";
import ResultsPage from "./pages/ResultsPage";
import AnswerKeyPage from "./pages/AnswerKeyPage";
import AnalysisPage from "./pages/AnalysisPage";
import HistoryPage from "./pages/HistoryPage";
import CountdownPage from "./pages/CountdownPage";
import PomodoroPage from "./pages/PomodoroPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Pages with sidebar layout */}
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/omr" element={<AppLayout><SetupPage /></AppLayout>} />
          <Route path="/omr/history" element={<AppLayout><HistoryPage /></AppLayout>} />
          <Route path="/countdown" element={<AppLayout><CountdownPage /></AppLayout>} />
          <Route path="/pomodoro" element={<AppLayout><PomodoroPage /></AppLayout>} />
          
          {/* Full-screen pages (no sidebar during test) */}
          <Route path="/test" element={<TestPage />} />
          <Route path="/results" element={<AppLayout><ResultsPage /></AppLayout>} />
          <Route path="/answer-key" element={<AppLayout><AnswerKeyPage /></AppLayout>} />
          <Route path="/analysis" element={<AppLayout><AnalysisPage /></AppLayout>} />
          <Route path="/history" element={<AppLayout><HistoryPage /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
