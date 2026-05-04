import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Nav } from "@/components/nav"
import "./index.css"
import HomePage from "./pages/home"
import CalculatorPage from "./pages/calculator"
import PlannerPage from "./pages/planner"
import GettingStartedPage from "./pages/getting-started"
import ComparisonPage from "./pages/comparison"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/getting-started" element={<GettingStartedPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </StrictMode>
)
