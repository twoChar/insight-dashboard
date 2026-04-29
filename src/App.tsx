import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FilterProvider } from "@/contexts/FilterContext";
import RevenueProfiling from "./pages/RevenueProfiling";
import DiscountAnalysis from "./pages/DiscountAnalysis";
import SalesVolume from "./pages/SalesVolume";
import DealerPerformance from "./pages/DealerPerformance";
import Inventory from "./pages/Inventory";
import MarginLeakage from "./pages/MarginLeakage";
import CapexAnalysis from "./pages/CapexAnalysis";
import ToolUtilisation from "./pages/ToolUtilisation";
import VolumeAnalysis from "./pages/VolumeAnalysis";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FilterProvider>
          <Routes>
            <Route path="/" element={<RevenueProfiling />} />
            <Route path="/discount" element={<DiscountAnalysis />} />
            <Route path="/sales" element={<SalesVolume />} />
            <Route path="/dealer" element={<DealerPerformance />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/margin" element={<MarginLeakage />} />
            <Route path="/capex" element={<CapexAnalysis />} />
            <Route path="/tool-utilisation" element={<ToolUtilisation />} />
            <Route path="/volume" element={<VolumeAnalysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FilterProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
