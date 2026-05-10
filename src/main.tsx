import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/lib/auth-context"
import { Nav } from "@/components/nav"
import "./index.css"
import HomePage from "./pages/home"
import CalculatorPage from "./pages/calculator"
import PlannerPage from "./pages/planner"
import GettingStartedPage from "./pages/getting-started"
import ComparisonPage from "./pages/comparison"
import LoginPage from "./pages/login"
import RegisterPage from "./pages/register"

import DashboardPage from "./pages/dashboard"
import BlockGeneratorPage from "./pages/block-generator"
import ForgotPasswordPage from "./pages/forgot-password"
import ResetPasswordPage from "./pages/reset-password"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/getting-started" element={<GettingStartedPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/block-generator" element={<BlockGeneratorPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </StrictMode>
)
