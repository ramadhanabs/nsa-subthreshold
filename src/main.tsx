import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"
import "./index.css"
import CalculatorPage from "./pages/calculator"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
