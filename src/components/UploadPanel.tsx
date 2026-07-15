import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Sparkles, FileText, Check } from "lucide-react";
import { parseAndValidateSpreadsheet } from "../utils/parser";
import { ValidationSummary } from "../types";

interface UploadPanelProps {
  onDataLoaded: (sales: any[], stores: any[], joinInfo: any) => void;
  onUseSampleData: () => void;
}

export default function UploadPanel({ onDataLoaded, onUseSampleData }: UploadPanelProps) {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [storesFile, setStoresFile] = useState<File | null>(null);
  
  const [salesSummary, setSalesSummary] = useState<ValidationSummary | null>(null);
  const [storesSummary, setStoresSummary] = useState<ValidationSummary | null>(null);
  
  const [salesLoading, setSalesLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);
  
  const [salesError, setSalesError] = useState<string | null>(null);
  const [storesError, setStoresError] = useState<string | null>(null);
  
  const [isSalesDragging, setIsSalesDragging] = useState(false);
  const [isStoresDragging, setIsStoresDragging] = useState(false);

  const salesInputRef = useRef<HTMLInputElement>(null);
  const storesInputRef = useRef<HTMLInputElement>(null);

  // Parse Sales File
  const handleSalesUpload = async (file: File) => {
    setSalesLoading(true);
    setSalesError(null);
    setSalesFile(file);
    try {
      const result = await parseAndValidateSpreadsheet(file, "sales");
      setSalesSummary(result.summary);
      if (!result.summary.isValid) {
        setSalesError(`Missing critical columns: ${result.summary.missingColumns.join(", ")}`);
      }
    } catch (err: any) {
      setSalesError(err.message || "Failed to parse sales file.");
      setSalesSummary(null);
    } finally {
      setSalesLoading(false);
    }
  };

  // Parse Stores File
  const handleStoresUpload = async (file: File) => {
    setStoresLoading(true);
    setStoresError(null);
    setStoresFile(file);
    try {
      const result = await parseAndValidateSpreadsheet(file, "stores");
      setStoresSummary(result.summary);
      if (!result.summary.isValid) {
        setStoresError(`Missing critical columns: ${result.summary.missingColumns.join(", ")}`);
      }
    } catch (err: any) {
      setStoresError(err.message || "Failed to parse stores file.");
      setStoresSummary(null);
    } finally {
      setStoresLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent, setDrag: (b: boolean) => void) => {
    e.preventDefault();
    setDrag(true);
  };

  const handleDragLeave = (setDrag: (b: boolean) => void) => {
    setDrag(false);
  };

  const handleDrop = (e: React.DragEvent, uploadFn: (f: File) => void, setDrag: (b: boolean) => void) => {
    e.preventDefault();
    setDrag(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFn(files[0]);
    }
  };

  // Trigger Joining and Proceeding
  const handleProceed = () => {
    if (!salesSummary || !storesSummary || !salesFile || !storesFile) return;
    
    // Read parsed raw rows
    const reader1 = new FileReader();
    reader1.onload = (e1) => {
      const parseSales = async () => {
        const resSales = await parseAndValidateSpreadsheet(salesFile, "sales");
        
        const reader2 = new FileReader();
        reader2.onload = async (e2) => {
          const resStores = await parseAndValidateSpreadsheet(storesFile, "stores");
          onDataLoaded(resSales.data, resStores.data, {
            salesFileName: salesFile.name,
            storesFileName: storesFile.name,
            salesRows: resSales.data.length,
            storesRows: resStores.data.length,
          });
        };
        reader2.readAsArrayBuffer(storesFile);
      };
      parseSales();
    };
    reader1.readAsArrayBuffer(salesFile);
  };

  const canProceed = salesSummary?.isValid && storesSummary?.isValid;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12" id="upload-panel-container">
      {/* Header Banner */}
      <div className="text-center mb-12" id="upload-header">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl font-display bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
          Retail Sales Intelligence
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-slate-500 font-sans leading-relaxed">
          Transform unstructured weekly sales reports and store reference tables into interactive, executive-ready KPIs and strategic business briefs with relational analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8" id="upload-grid">
        {/* Sales Report Upload Area */}
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="sales-upload-card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">1. Weekly Sales Dataset</h2>
                <p className="text-xs text-slate-400">retail_weekly_sales.xlsx / .csv</p>
              </div>
            </div>
            {salesSummary?.isValid && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <Check className="h-3 w-3 mr-1" /> Ready
              </span>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div
              onDragOver={(e) => handleDragOver(e, setIsSalesDragging)}
              onDragLeave={() => handleDragLeave(setIsSalesDragging)}
              onDrop={(e) => handleDrop(e, handleSalesUpload, setIsSalesDragging)}
              onClick={() => salesInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] ${
                isSalesDragging
                  ? "border-emerald-500 bg-emerald-50/40"
                  : salesSummary?.isValid
                  ? "border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <input
                type="file"
                ref={salesInputRef}
                onChange={(e) => e.target.files?.[0] && handleSalesUpload(e.target.files[0])}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              
              {salesLoading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                  <p className="mt-2 text-xs text-slate-500 font-medium">Scanning and validating spreadsheet...</p>
                </div>
              ) : salesFile ? (
                <div className="flex flex-col items-center">
                  <FileText className={`h-10 w-10 ${salesSummary?.isValid ? "text-emerald-600" : "text-amber-500"}`} />
                  <p className="mt-2 text-xs font-semibold text-slate-700 truncate max-w-[200px]">{salesFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{(salesFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">Drag file here or click to browse</p>
                  <p className="text-[11px] text-slate-400 mt-1">Supports XLSX, XLS, and CSV files</p>
                </div>
              )}
            </div>

            {/* Sales Validation Results */}
            <div className="mt-5 flex-1" id="sales-validation-panel">
              <AnimatePresence mode="wait">
                {salesError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 bg-red-50 rounded-lg border border-red-100 flex items-start space-x-2 text-red-700 text-xs"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{salesError}</span>
                  </motion.div>
                )}

                {salesSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                        <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Row Count</span>
                        <span className="text-sm font-bold text-slate-800">{salesSummary.rowCount.toLocaleString()} Rows</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                        <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Columns</span>
                        <span className="text-sm font-bold text-slate-800">{salesSummary.columnsPresent.length} Identified</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                        <span>Null/Missing Values</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${salesSummary.nullCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {salesSummary.nullCount} Flagged
                        </span>
                      </div>
                      {salesSummary.nullCount > 0 ? (
                        <div className="max-h-24 overflow-y-auto pr-1 text-[11px] text-slate-500 space-y-1 mt-1">
                          {Object.entries(salesSummary.nullFieldsSummary)
                            .filter(([_, count]) => count > 0)
                            .map(([field, count]) => (
                              <div key={field} className="flex justify-between">
                                <span className="font-mono text-[10px]">{field}</span>
                                <span className="text-slate-400 font-medium">{count} empty rows</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Perfect sheet hygiene. No missing fields discovered.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Store Master Reference Data */}
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="stores-upload-card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">2. Store Master Dataset</h2>
                <p className="text-xs text-slate-400">store_master.xlsx / .csv</p>
              </div>
            </div>
            {storesSummary?.isValid && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                <Check className="h-3 w-3 mr-1" /> Ready
              </span>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <div
              onDragOver={(e) => handleDragOver(e, setIsStoresDragging)}
              onDragLeave={() => handleDragLeave(setIsStoresDragging)}
              onDrop={(e) => handleDrop(e, handleStoresUpload, setIsStoresDragging)}
              onClick={() => storesInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] ${
                isStoresDragging
                  ? "border-indigo-500 bg-indigo-50/40"
                  : storesSummary?.isValid
                  ? "border-indigo-200 bg-indigo-50/10 hover:bg-indigo-50/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <input
                type="file"
                ref={storesInputRef}
                onChange={(e) => e.target.files?.[0] && handleStoresUpload(e.target.files[0])}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              
              {storesLoading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="mt-2 text-xs text-slate-500 font-medium">Scanning and validating reference data...</p>
                </div>
              ) : storesFile ? (
                <div className="flex flex-col items-center">
                  <FileText className={`h-10 w-10 ${storesSummary?.isValid ? "text-indigo-600" : "text-amber-500"}`} />
                  <p className="mt-2 text-xs font-semibold text-slate-700 truncate max-w-[200px]">{storesFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{(storesFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">Drag file here or click to browse</p>
                  <p className="text-[11px] text-slate-400 mt-1">Supports XLSX, XLS, and CSV files</p>
                </div>
              )}
            </div>

            {/* Stores Validation Results */}
            <div className="mt-5 flex-1" id="stores-validation-panel">
              <AnimatePresence mode="wait">
                {storesError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 bg-red-50 rounded-lg border border-red-100 flex items-start space-x-2 text-red-700 text-xs"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{storesError}</span>
                  </motion.div>
                )}

                {storesSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                        <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Row Count</span>
                        <span className="text-sm font-bold text-slate-800">{storesSummary.rowCount} Records</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                        <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Columns</span>
                        <span className="text-sm font-bold text-slate-800">{storesSummary.columnsPresent.length} Identified</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                        <span>Null/Missing Values</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${storesSummary.nullCount > 0 ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>
                          {storesSummary.nullCount} Flagged
                        </span>
                      </div>
                      {storesSummary.nullCount > 0 ? (
                        <div className="max-h-24 overflow-y-auto pr-1 text-[11px] text-slate-500 space-y-1 mt-1">
                          {Object.entries(storesSummary.nullFieldsSummary)
                            .filter(([_, count]) => count > 0)
                            .map(([field, count]) => (
                              <div key={field} className="flex justify-between">
                                <span className="font-mono text-[10px]">{field}</span>
                                <span className="text-slate-400 font-medium">{count} empty rows</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">All reference entries fully completed. Integrity high.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Joining Status & Launch Panel */}
      <AnimatePresence>
        {salesSummary && storesSummary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-6 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 mb-8"
            id="joining-status-panel"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-indigo-500/25 rounded-lg text-indigo-400 shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">System Ready for Relational Join</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Valid metadata structures confirmed. Ready to perform standard <code className="text-indigo-300 font-semibold">LEFT JOIN</code> on primary key <code className="text-indigo-300 font-semibold font-mono">store_id</code> between sales-ledger and stores-ledger.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end">
                {canProceed ? (
                  <button
                    onClick={handleProceed}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                    id="generate-join-btn"
                  >
                    Generate joined dashboard
                  </button>
                ) : (
                  <div className="inline-flex items-center text-xs text-amber-400 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 mr-1.5" /> Please resolve missing columns
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Baseline Mock Option */}
      <div className="border-t border-slate-200 pt-8 text-center" id="mock-trigger-panel">
        <p className="text-xs text-slate-500 font-medium">Don't have custom spreadsheets on hand?</p>
        <button
          onClick={onUseSampleData}
          className="mt-3 inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all font-semibold cursor-pointer text-xs space-x-1.5"
          id="load-sample-btn"
        >
          <Sparkles className="h-4 w-4 text-slate-600 animate-pulse" />
          <span>Load sample retail dataset (1,920 Rows)</span>
        </button>
      </div>
    </div>
  );
}
