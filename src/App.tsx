import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, BarChart2, Github, Globe, Store, ShieldAlert } from "lucide-react";
import UploadPanel from "./components/UploadPanel";
import Dashboard from "./components/Dashboard";
import { SalesRecord, StoreMaster } from "./types";
import { joinDatasets } from "./utils/parser";
import { SAMPLE_STORES, generateSampleSales } from "./sampleData";

export default function App() {
  const [salesData, setSalesData] = useState<SalesRecord[] | null>(null);
  const [storeMaster, setStoreMaster] = useState<StoreMaster[] | null>(null);
  const [joinInfo, setJoinInfo] = useState<{
    salesFileName: string;
    storesFileName: string;
    salesRows: number;
    storesRows: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"upload" | "dashboard">("upload");

  const [joinStats, setJoinStats] = useState<{
    matched: number;
    unmatched: number;
    unmatchedIds: string[];
  } | null>(null);

  // Trigger when files are parsed and validated in UploadPanel
  const handleDataLoaded = (rawSales: any[], rawStores: any[], info: any) => {
    // Cast and perform full relational left join
    const { joinedData, matchedCount, unmatchedCount, unmatchedStoreIds } = joinDatasets(
      rawSales as SalesRecord[],
      rawStores as StoreMaster[]
    );

    setSalesData(joinedData);
    setStoreMaster(rawStores as StoreMaster[]);
    setJoinInfo(info);
    setJoinStats({
      matched: matchedCount,
      unmatched: unmatchedCount,
      unmatchedIds: unmatchedStoreIds,
    });
    setViewMode("dashboard");
  };

  // Trigger for immediate sample data loading
  const handleUseSampleData = () => {
    const rawStores = SAMPLE_STORES;
    const rawSales = generateSampleSales();

    const { joinedData, matchedCount, unmatchedCount, unmatchedStoreIds } = joinDatasets(
      rawSales,
      rawStores
    );

    setSalesData(joinedData);
    setStoreMaster(rawStores);
    setJoinInfo(null); // Indicates sample data
    setJoinStats({
      matched: matchedCount,
      unmatched: unmatchedCount,
      unmatchedIds: unmatchedStoreIds,
    });
    setViewMode("dashboard");
  };

  const handleReset = () => {
    setSalesData(null);
    setStoreMaster(null);
    setJoinInfo(null);
    setJoinStats(null);
    setViewMode("upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#080d1a] via-[#0f1626] to-[#17223b] bg-grid-pattern text-slate-100 font-sans flex flex-col justify-between" id="app-wrapper">
      
      {/* Universal Global Header Frame */}
      <header className="bg-[#080d1a]/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-md" id="global-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleReset}>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-wider text-white font-display">RetailIntel</span>
              <span className="text-[10px] block text-indigo-400 font-semibold font-mono leading-none tracking-tight">Intelligence Engine</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {viewMode === "dashboard" && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-2xs">
                <BarChart2 className="h-3 w-3 mr-1" /> Executive Mapped View
              </span>
            )}
            <div className="text-xs text-slate-300 font-mono font-medium bg-slate-800 border border-slate-700/60 rounded-md px-2 py-0.5 shadow-2xs">
              v1.2.0
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto" id="main-content-stage">
        <AnimatePresence mode="wait">
          {viewMode === "upload" ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <UploadPanel
                onDataLoaded={handleDataLoaded}
                onUseSampleData={handleUseSampleData}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {salesData && (
                <Dashboard
                  salesData={salesData}
                  joinInfo={joinInfo || undefined}
                  onReset={handleReset}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Regulatory Footer Frame */}
      <footer className="bg-[#080d1a]/90 backdrop-blur-md border-t border-slate-800/80 py-6 text-center text-[11px] text-slate-400" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-400">
            © 2026 Retail Intel Technologies. All corporate schemas protected by ISO-27001 validation protocols.
          </p>
          <div className="flex space-x-4">
            <span className="hover:text-indigo-400 transition cursor-help">Relational Join Engine v1.0</span>
            <span className="text-slate-800">|</span>
            <span className="hover:text-indigo-400 transition cursor-help">Google AI Studio Integrator</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
