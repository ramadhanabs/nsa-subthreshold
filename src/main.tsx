import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Nav } from "@/components/nav"
import "./index.css"
import CalculatorPage from "./pages/calculator"
import PlannerPage from "./pages/planner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/planner" element={<PlannerPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </StrictMode>
)
