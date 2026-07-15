import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart
} from "recharts";
import {
  DollarSign, ShoppingBag, AlertTriangle, Star, Activity, ArrowUpRight,
  Sparkles, SlidersHorizontal, Search, RefreshCw, Undo2, ArrowUpDown, ShieldCheck,
  CheckCircle2, Download, FileText, Filter, Calendar, MapPin, Building, Percent, Trophy
} from "lucide-react";
import { SalesRecord, AggregatedMetrics } from "../types";
import { aggregateRetailData } from "../utils/parser";

interface DashboardProps {
  salesData: SalesRecord[];
  joinInfo?: {
    salesFileName: string;
    storesFileName: string;
    salesRows: number;
    storesRows: number;
  };
  onReset: () => void;
}

// Visual color palette constants
const COLORS_PASTEL = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];
const COLORS_MUTED = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#f472b6"];

export default function Dashboard({ salesData, joinInfo, onReset }: DashboardProps) {
  // 1. Unified Filter States
  const [weekFilter, setWeekFilter] = useState<string>("All");
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [formatFilter, setFormatFilter] = useState<string>("All");
  const [storeFilter, setStoreFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("All"); // or search input below
  const [searchTextInput, setSearchTextInput] = useState<string>("");

  // Table sorting states
  const [sortField, setSortField] = useState<string>("netSales");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // AI Summary States
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastSyncedMetrics, setLastSyncedMetrics] = useState<AggregatedMetrics | null>(null);

  // 2. Extract filter options dynamically from the complete, unfiltered raw data
  const filterOptions = useMemo(() => {
    if (!salesData) return { weeks: [], regions: [], cities: [], formats: [], stores: [], categories: [] };
    
    const weeks = Array.from(new Set(salesData.map(d => d.week_start_date).filter(Boolean))).sort();
    const regions = Array.from(new Set(salesData.map(d => d.region).filter(Boolean))).sort();
    const cities = Array.from(new Set(salesData.map(d => d.city).filter(Boolean))).sort();
    const formats = Array.from(new Set(salesData.map(d => d.store_format).filter(Boolean))).sort();
    const stores = Array.from(new Set(salesData.map(d => d.store_name).filter(Boolean))).sort();
    const categories = Array.from(new Set(salesData.map(d => d.product_category).filter(Boolean))).sort();
    
    return { weeks, regions, cities, formats, stores, categories };
  }, [salesData]);

  // 3. Compute dynamic filtered dataset based on all 6 filters + Search Query
  const filteredSales = useMemo(() => {
    if (!salesData) return [];
    return salesData.filter((row) => {
      if (weekFilter !== "All" && row.week_start_date !== weekFilter) return false;
      if (regionFilter !== "All" && row.region !== regionFilter) return false;
      if (cityFilter !== "All" && row.city !== cityFilter) return false;
      if (formatFilter !== "All" && row.store_format !== formatFilter) return false;
      if (storeFilter !== "All" && row.store_name !== storeFilter) return false;
      if (categoryFilter !== "All" && row.product_category !== categoryFilter) return false;
      
      if (searchTextInput.trim() !== "") {
        const q = searchTextInput.toLowerCase();
        const storeMatch = row.store_name?.toLowerCase().includes(q) || row.store_id?.toLowerCase().includes(q);
        const cityMatch = row.city?.toLowerCase().includes(q);
        const categoryMatch = row.product_category?.toLowerCase().includes(q);
        const formatMatch = row.store_format?.toLowerCase().includes(q);
        if (!storeMatch && !cityMatch && !categoryMatch && !formatMatch) return false;
      }
      return true;
    });
  }, [salesData, weekFilter, regionFilter, cityFilter, formatFilter, storeFilter, categoryFilter, searchTextInput]);

  // 4. Compute metrics reactively from the filtered subset
  const metrics = useMemo(() => {
    if (filteredSales.length === 0) return null;
    return aggregateRetailData(filteredSales);
  }, [filteredSales]);

  // Handle AI analysis queries
  const fetchAiSummary = async (targetMetrics: AggregatedMetrics) => {
    if (!targetMetrics) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSummary: {
            totalNetSales: targetMetrics.totalNetSales,
            totalSalesTarget: targetMetrics.totalSalesTarget,
            totalTransactions: targetMetrics.totalTransactions,
            totalReturns: targetMetrics.totalReturns,
            totalStockouts: targetMetrics.totalStockouts,
            totalMarketingSpend: targetMetrics.totalMarketingSpend,
            avgCustomerRating: targetMetrics.avgCustomerRating,
            regionalPerformance: targetMetrics.regionalPerformance.map(r => ({
              region: r.region,
              netSales: r.netSales,
              salesTarget: r.salesTarget,
              achievementRate: r.achievementRate,
              stockouts: r.stockouts,
              returns: r.returns,
              marketingROI: r.marketingROI,
              avgRating: r.avgRating
            })),
            formatPerformance: targetMetrics.formatPerformance,
            categoryPerformance: targetMetrics.categoryPerformance
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }
      setAiSummary(resData.summary || "");
      setLastSyncedMetrics(targetMetrics);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to reach intelligence agent.");
    } finally {
      setAiLoading(false);
    }
  };

  // Perform initial fetch on mount/load when metrics are available
  useEffect(() => {
    if (metrics && !lastSyncedMetrics) {
      fetchAiSummary(metrics);
    }
  }, [metrics]);

  // Determine if the current AI briefing does not match the active filtered view
  const isAiStale = useMemo(() => {
    if (!metrics || !lastSyncedMetrics) return false;
    return (
      Math.abs(metrics.totalNetSales - lastSyncedMetrics.totalNetSales) > 1 ||
      metrics.totalTransactions !== lastSyncedMetrics.totalTransactions ||
      metrics.totalStockouts !== lastSyncedMetrics.totalStockouts
    );
  }, [metrics, lastSyncedMetrics]);

  // 5. Formatting Helpers
  const formatValue = (val: number) => {
    if (val >= 1000000) return `₹${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val.toFixed(2)}`;
  };

  const formatNumberCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toString();
  };

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  // 6. Dynamic Computed Business Heuristics / Insights
  const heuristicInsights = useMemo(() => {
    if (!metrics) return null;

    // Region performance rankings
    const sortedRegsSales = [...metrics.regionalPerformance].sort((a, b) => b.netSales - a.netSales);
    const bestRegionName = sortedRegsSales[0]?.region || "N/A";
    const bestRegionSales = sortedRegsSales[0]?.netSales || 0;
    const bestRegionAch = sortedRegsSales[0]?.achievementRate || 0;
    const worstRegionName = sortedRegsSales[sortedRegsSales.length - 1]?.region || "N/A";
    const worstRegionSales = sortedRegsSales[sortedRegsSales.length - 1]?.netSales || 0;
    const worstRegionAch = sortedRegsSales[sortedRegsSales.length - 1]?.achievementRate || 0;

    // Target achievement rankings
    const sortedRegsAch = [...metrics.regionalPerformance].sort((a, b) => b.achievementRate - a.achievementRate);
    const topTargetRegionName = sortedRegsAch[0]?.region || "N/A";
    const topTargetRegionAch = sortedRegsAch[0]?.achievementRate || 0;

    // Stores missing targets (achievement < 100%)
    const missingTargetStores = metrics.storePerformance.filter(s => s.achievementRate < 100);
    const missingTargetCount = missingTargetStores.length;
    const totalStoresCount = metrics.storePerformance.length;
    const missingTargetPct = totalStoresCount > 0 ? (missingTargetCount / totalStoresCount) * 100 : 0;
    
    // Top store target deficits (absolute distance below target)
    const topDeficits = missingTargetStores
      .map(s => ({ ...s, deficit: Math.max(0, s.salesTarget - s.netSales) }))
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 3);

    // High return categories (sorted by returnRate)
    const highReturnCategories = [...metrics.categoryPerformance]
      .filter(c => c.returnRate > 0)
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 3);

    // Supply chain stockouts: stores with highest stockouts
    const stockoutHotspots = [...metrics.storePerformance]
      .filter(s => s.stockouts > 0)
      .sort((a, b) => b.stockouts - a.stockouts)
      .slice(0, 3);

    return {
      bestRegionName,
      bestRegionSales,
      bestRegionAch,
      worstRegionName,
      worstRegionSales,
      worstRegionAch,
      topTargetRegionName,
      topTargetRegionAch,
      missingTargetCount,
      totalStoresCount,
      missingTargetPct,
      topDeficits,
      highReturnCategories,
      stockoutHotspots
    };
  }, [metrics]);

  // 7. Store Leaderboard Data
  const leaderboardData = useMemo(() => {
    if (!metrics) return [];
    // Sort stores by Net Sales and take top 8
    return [...metrics.storePerformance].slice(0, 8);
  }, [metrics]);

  // 8. Sorting/Filtering final lists for Table display
  const tableStoresList = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.storePerformance]
      .sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (typeof valA === "string") {
          return sortDirection === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
  }, [metrics, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // 9. Clear All Active Filters
  const handleClearFilters = () => {
    setWeekFilter("All");
    setRegionFilter("All");
    setCityFilter("All");
    setFormatFilter("All");
    setStoreFilter("All");
    setCategoryFilter("All");
    setSearchTextInput("");
  };

  // 10. Export Filtered Data (CSV Utility)
  const handleExportFilteredCSV = () => {
    if (!filteredSales || filteredSales.length === 0) return;
    
    const headers = [
      "Week Start Date", "Region", "Store ID", "Store Name", "City", "Store Format", 
      "Product Category", "Footfall", "Transactions", "Units Sold", "Gross Sales", 
      "Discount Amount", "Net Sales", "Sales Target", "Inventory On Hand", "Stockouts", 
      "Returns Amount", "Customer Rating", "Marketing Spend"
    ];
    
    const csvRows = [headers.join(",")];
    
    filteredSales.forEach(row => {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const values = [
        escapeCsv(row.week_start_date),
        escapeCsv(row.region),
        escapeCsv(row.store_id),
        escapeCsv(row.store_name),
        escapeCsv(row.city),
        escapeCsv(row.store_format),
        escapeCsv(row.product_category),
        row.footfall,
        row.transactions,
        row.units_sold,
        row.gross_sales,
        row.discount_amount,
        row.net_sales,
        row.sales_target,
        row.inventory_on_hand,
        row.stockouts,
        row.returns_amount,
        row.customer_rating,
        row.marketing_spend
      ];
      csvRows.push(values.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_intel_filtered_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 11. Export Executive Insights Report (Markdown Utility)
  const handleExportInsightsMD = () => {
    if (!metrics || !heuristicInsights) return;
    
    const dateStr = new Date().toLocaleString();
    let md = `# Retail Intelligence Executive Insights Report\n`;
    md += `Generated on: ${dateStr}\n\n`;
    
    md += `## 🎛️ Active Filter Configurations\n`;
    md += `- **Week/Period**: ${weekFilter}\n`;
    md += `- **Region**: ${regionFilter}\n`;
    md += `- **City**: ${cityFilter}\n`;
    md += `- **Store Format**: ${formatFilter}\n`;
    md += `- **Store Venue**: ${storeFilter}\n`;
    md += `- **Product Category**: ${categoryFilter}\n`;
    if (searchTextInput) md += `- **Search Query**: "${searchTextInput}"\n`;
    md += `\n`;
    
    md += `## 📊 Executive KPIs\n`;
    md += `- **Net Sales**: ${formatValue(metrics.totalNetSales)}\n`;
    md += `- **Target Achievement**: ${metrics.achievementRate.toFixed(1)}% (Target: ${formatValue(metrics.totalSalesTarget)})\n`;
    md += `- **Average Transaction Value (ATV)**: ${formatValue(metrics.atv)}\n`;
    md += `- **Return Rate**: ${metrics.returnsPct.toFixed(2)}% (Total Returns: ${formatValue(metrics.totalReturns)})\n`;
    md += `- **Discount Rate**: ${metrics.discountRate.toFixed(2)}% (Total Discounts: ${formatValue(metrics.totalDiscountAmount)})\n`;
    md += `- **Stockout Incidents**: ${metrics.totalStockouts} logged events\n`;
    md += `- **Customer Sentiment Rating**: ${metrics.avgCustomerRating.toFixed(2)} / 5.0\n`;
    md += `\n`;
    
    md += `## 💡 Computed Operational Audit\n`;
    md += `### Regional Performances:\n`;
    md += `- **Top Regional Revenue**: ${heuristicInsights.bestRegionName} (${formatValue(heuristicInsights.bestRegionSales)}, ${heuristicInsights.bestRegionAch.toFixed(1)}% achieved)\n`;
    md += `- **Bottom Regional Revenue**: ${heuristicInsights.worstRegionName} (${formatValue(heuristicInsights.worstRegionSales)}, ${heuristicInsights.worstRegionAch.toFixed(1)}% achieved)\n`;
    md += `- **Target Leader**: ${heuristicInsights.topTargetRegionName} reached ${heuristicInsights.topTargetRegionAch.toFixed(1)}% target\n\n`;
    
    md += `### Store Target Deficits:\n`;
    md += `- **Stores Missing Targets**: ${heuristicInsights.missingTargetCount} out of ${heuristicInsights.totalStoresCount} stores (${heuristicInsights.missingTargetPct.toFixed(1)}%)\n`;
    if (heuristicInsights.topDeficits.length > 0) {
      md += `- **Top Revenue Gap Locations**:\n`;
      heuristicInsights.topDeficits.forEach((s, idx) => {
        md += `  ${idx + 1}. **${s.store_name}** (${s.region}): Missing target by ${formatValue(s.deficit)} (Target Achieved: ${s.achievementRate.toFixed(1)}%)\n`;
      });
    }
    md += `\n`;
    
    md += `### High Return Product Categories:\n`;
    if (heuristicInsights.highReturnCategories.length > 0) {
      heuristicInsights.highReturnCategories.forEach((c, idx) => {
        md += `- **${c.category}**: ${c.returnRate.toFixed(1)}% return rate (Total returns: ${formatValue(c.returns)})\n`;
      });
    } else {
      md += `- No categories exceed standard return risk thresholds.\n`;
    }
    md += `\n`;
    
    md += `### Supply Chain Stockout Risks:\n`;
    if (heuristicInsights.stockoutHotspots.length > 0) {
      heuristicInsights.stockoutHotspots.forEach((s, idx) => {
        md += `- **${s.store_name}** (${s.region}): ${s.stockouts} stockout incidents (Sentiment Score: ${s.avgRating.toFixed(1)}★)\n`;
      });
    } else {
      md += `- No venues show elevated stockout hazards.\n`;
    }
    md += `\n`;
    
    md += `## 🤖 AI Strategic Consultant Briefing\n`;
    md += `${aiSummary || "AI summary not generated. Click 'Sync AI' to generate the strategic briefing."}\n`;
    
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_intel_executive_report_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-8 px-4 py-6" id="retail-dashboard-stage">
      
      {/* 1. Upper Header & Context Desk */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 pb-6 gap-4" id="dashboard-header-container">
        <div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Mapped & Relational Join Active
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl mt-2 font-display bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            Retail Intelligence & Operations Hub
          </h1>
          {joinInfo ? (
            <p className="text-xs text-slate-500 mt-1.5 font-sans">
              Analyzing ledger <span className="font-semibold font-mono text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">{joinInfo.salesFileName}</span> joined with <span className="font-semibold font-mono text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">{joinInfo.storesFileName}</span> ({joinInfo.salesRows.toLocaleString()} rows verified).
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1.5 font-sans">
              Exploring pre-populated benchmark dataset (96 chronological weeks, 1,920 records mapped across 20 retail venues).
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <button
            onClick={handleExportFilteredCSV}
            disabled={filteredSales.length === 0}
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-40 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
            id="export-csv-btn"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV ({filteredSales.length})
          </button>
          
          <button
            onClick={handleExportInsightsMD}
            disabled={!metrics}
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
            id="export-report-btn"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Export Insights (MD)
          </button>

          <button
            onClick={onReset}
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
            id="reset-datasets-btn"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1.5" />
            Upload New Data
          </button>
        </div>
      </div>

      {/* 2. Interactive Filtering Deck */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:shadow-sm transition-all duration-300" id="filtering-panel">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2 text-slate-800">
            <Filter className="h-4.5 w-4.5 text-indigo-600" />
            <h2 className="font-bold text-sm tracking-tight font-display text-slate-900">Active Filters Desk</h2>
          </div>
          {(weekFilter !== "All" || regionFilter !== "All" || cityFilter !== "All" || formatFilter !== "All" || storeFilter !== "All" || categoryFilter !== "All" || searchTextInput !== "") && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center transition"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* Week Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" /> Week Starting
            </label>
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Weeks ({filterOptions.weeks.length})</option>
              {filterOptions.weeks.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" /> Region
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Regions</option>
              {filterOptions.regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <Building className="h-3.5 w-3.5 mr-1 text-slate-400" /> City
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Cities</option>
              {filterOptions.cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Store Format Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <ShoppingBag className="h-3.5 w-3.5 mr-1 text-slate-400" /> Store Format
            </label>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Formats</option>
              {filterOptions.formats.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Store Venue Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <Trophy className="h-3.5 w-3.5 mr-1 text-slate-400" /> Store Venue
            </label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Stores</option>
              {filterOptions.stores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Product Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center font-display">
              <Percent className="h-3.5 w-3.5 mr-1 text-slate-400" /> Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer transition hover:border-slate-300"
            >
              <option value="All">All Categories</option>
              {filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Text Filter Search Bar */}
        <div className="relative pt-2">
          <Search className="absolute left-3 top-5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Global text search across Store ID, Name, City, Format, Category..."
            value={searchTextInput}
            onChange={(e) => setSearchTextInput(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* If No Data Matches the Filters */}
      {!metrics ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white border border-slate-200 rounded-xl shadow-xs p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
          <h3 className="text-sm font-bold text-slate-900">No Records Match Active Filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            The active filter combination resulted in zero mapped transactional sales. Please widen your filter settings or clear them using the button above.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition"
          >
            Clear Active Filters
          </button>
        </div>
      ) : (
        <>
          {/* 3. KPI Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="kpi-grid">
            
            {/* KPI 1: Net Sales */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-300/80 hover:-translate-y-0.5 transition-all duration-300" id="kpi-net-sales">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-display">Net Sales</span>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 shadow-2xs">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">{formatValue(metrics.totalNetSales)}</h3>
                <div className="flex items-center text-xs mt-1.5 text-slate-500 truncate">
                  <span className="font-semibold text-slate-700 mr-1">Target: {formatValue(metrics.totalSalesTarget)}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Gross: {formatValue(metrics.totalGrossSales)}
                </div>
              </div>
            </div>

            {/* KPI 2: Target Achievement */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-300/80 hover:-translate-y-0.5 transition-all duration-300" id="kpi-achievement">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-display">Target Achieved</span>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 shadow-2xs">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">{formatPercent(metrics.achievementRate)}</h3>
                <div className="flex items-center text-xs mt-1.5">
                  <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${metrics.achievementRate >= 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 'bg-amber-50 text-amber-700 border border-amber-100/50'}`}>
                    {metrics.achievementRate >= 100 ? "Goal Met" : "Target Gap"}
                  </span>
                </div>
                {/* Achievement progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${metrics.achievementRate >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                    style={{ width: `${Math.min(100, metrics.achievementRate)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* KPI 3: ATV */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-cyan-300/80 hover:-translate-y-0.5 transition-all duration-300" id="kpi-atv">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-display">Avg Transaction (ATV)</span>
                <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl shrink-0 shadow-2xs">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">{formatValue(metrics.atv)}</h3>
                <div className="flex items-center text-xs mt-1.5 text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">{formatNumberCompact(metrics.totalTransactions)} Tickets</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Items/Ticket: {(metrics.totalUnitsSold / (metrics.totalTransactions || 1)).toFixed(1)}
                </div>
              </div>
            </div>

            {/* KPI 4: Return Rate */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-rose-300/80 hover:-translate-y-0.5 transition-all duration-300" id="kpi-return-rate">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-display">Return Rate</span>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0 shadow-2xs">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">{formatPercent(metrics.returnsPct)}</h3>
                <div className="flex items-center text-xs mt-1.5 text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">Returns: {formatValue(metrics.totalReturns)}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Sentiment score: {metrics.avgCustomerRating.toFixed(2)} ★
                </div>
              </div>
            </div>

            {/* KPI 5: Discount Rate */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-pink-300/80 hover:-translate-y-0.5 transition-all duration-300" id="kpi-discount-rate">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-display">Discount Rate</span>
                <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl shrink-0 shadow-2xs">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">{formatPercent(metrics.discountRate)}</h3>
                <div className="flex items-center text-xs mt-1.5 text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">Discounts: {formatValue(metrics.totalDiscountAmount)}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Promo ROI: {metrics.marketingROI.toFixed(1)}x return
                </div>
              </div>
            </div>

          </div>

          {/* 4. Strategic Analysis & Business Insights Desk */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8" id="ai-heuristic-desk">
            
            {/* McKinsey Partners AI Executive Summary Card (3/5 Width) */}
            <div className="lg:col-span-3 flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-300" id="ai-insights-card">
              <div className="p-5.5 border-b border-slate-200/60 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-500/30 rounded-lg text-indigo-400 shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">Principal Consultant AI Briefing</h2>
                    <p className="text-[10px] text-slate-400">Powered by Gemini 3.5 Flash</p>
                  </div>
                </div>
                
                {aiLoading ? (
                  <span className="inline-flex items-center text-[10px] text-indigo-300 font-semibold bg-indigo-500/20 px-2.5 py-1 rounded-full animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Analyzing...
                  </span>
                ) : isAiStale ? (
                  <button
                    onClick={() => fetchAiSummary(metrics)}
                    className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-full hover:bg-amber-200 animate-bounce transition cursor-pointer"
                  >
                    Sync Filters
                  </button>
                ) : (
                  <button
                    onClick={() => fetchAiSummary(metrics)}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                    title="Force refresh AI Briefing"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between min-h-[350px]" id="ai-body">
                {isAiStale && !aiLoading && (
                  <div className="mb-4 bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-lg text-xs flex items-start space-x-2 animate-fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Filters Changed:</span> The AI Briefing text matches your previous view. Click <button onClick={() => fetchAiSummary(metrics)} className="font-black underline text-indigo-600 hover:text-indigo-800">Sync Filters</button> above to re-generate the briefing on the active subset.
                    </div>
                  </div>
                )}

                {aiLoading ? (
                  <div className="space-y-4 animate-pulse flex-1">
                    <div className="h-5 bg-slate-100 rounded w-1/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded"></div>
                      <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                      <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                    </div>
                    <div className="h-5 bg-slate-100 rounded w-1/3 mt-6"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-11/12"></div>
                      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="flex flex-col items-center justify-center py-10 flex-1">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
                    <p className="text-xs text-slate-600 font-semibold">{aiError}</p>
                    <button
                      onClick={() => fetchAiSummary(metrics)}
                      className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Retry API connection
                    </button>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-700 text-xs leading-relaxed space-y-4 flex-1">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                )}
                
                <div className="mt-5 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>*Strategic insights based on active multi-dimensional filter state.*</span>
                  <span>Refreshed on-demand</span>
                </div>
              </div>
            </div>

            {/* Heuristic Operational Audit Card (2/5 Width) */}
            <div className="lg:col-span-2 flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-300" id="heuristic-insights-card">
              <div className="p-5.5 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">Strategic Performance Audit</h2>
                  <p className="text-[10px] text-slate-400">Deterministic metrics computed in real-time</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                  Live Audit
                </span>
              </div>

              <div className="p-5 flex-1 space-y-5 text-xs text-slate-700" id="heuristic-body">
                
                {/* Heuristic 1: Regional Performer Highlights */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Regional Standings</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Top Regional Revenue</span>
                      <span className="font-bold text-slate-900 block mt-1 truncate">{heuristicInsights?.bestRegionName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatValue(heuristicInsights?.bestRegionSales || 0)} ({heuristicInsights?.bestRegionAch.toFixed(1)}%)</span>
                    </div>
                    <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                      <span className="text-[10px] font-semibold text-rose-800 uppercase block">Underperforming Region</span>
                      <span className="font-bold text-slate-900 block mt-1 truncate">{heuristicInsights?.worstRegionName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatValue(heuristicInsights?.worstRegionSales || 0)} ({heuristicInsights?.worstRegionAch.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Heuristic 2: Stores Missing Target */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span>Stores Missing Target</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      {heuristicInsights?.missingTargetCount} / {heuristicInsights?.totalStoresCount} venues
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    <span className="font-bold text-rose-600">{heuristicInsights?.missingTargetPct.toFixed(1)}%</span> of active venues are currently underperforming their net sales budget targets.
                  </p>
                  
                  {heuristicInsights && heuristicInsights.topDeficits.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Largest Revenue Deficits:</span>
                      {heuristicInsights.topDeficits.map((s) => (
                        <div key={s.store_id} className="flex items-center justify-between text-[11px] p-1.5 bg-slate-50 rounded border border-slate-100">
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">{s.store_name}</span>
                          <span className="text-slate-500 font-mono text-xs font-bold">Missing {formatValue(s.deficit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Heuristic 3: High Return Categories */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <Percent className="h-4 w-4 text-indigo-600" />
                    <span>High Return Merchandise</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Merchandise categories with elevated returns risk. Overall returning segment is <span className="font-bold text-indigo-600 font-mono">{formatPercent(metrics.returnsPct)}</span> of net sales.
                  </p>
                  
                  {heuristicInsights && heuristicInsights.highReturnCategories.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      {heuristicInsights.highReturnCategories.map((c) => (
                        <div key={c.category} className="flex justify-between items-center text-[11px] p-1 rounded-sm">
                          <span className="font-semibold text-slate-700">{c.category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-rose-600 font-bold">{c.returnRate.toFixed(1)}% return rate</span>
                            <span className="text-[10px] text-slate-400">({formatValue(c.returns)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Heuristic 4: Supply Chain & Stockout Risks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <Activity className="h-4 w-4 text-pink-600" />
                      <span>Stockout Hazard Venues</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      {metrics.totalStockouts} weekly stockouts
                    </span>
                  </div>
                  
                  {heuristicInsights && heuristicInsights.stockoutHotspots.length > 0 ? (
                    <div className="pt-1.5 space-y-1.5">
                      {heuristicInsights.stockoutHotspots.map((s) => (
                        <div key={s.store_id} className="flex items-center justify-between text-[11px] p-1.5 bg-amber-50/50 border border-amber-100 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-700">{s.store_name}</span>
                            <span className="text-[10px] text-slate-400">({s.region})</span>
                          </div>
                          <span className="font-bold font-mono text-amber-700">{s.stockouts} Stockouts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No inventory stockout incidents flagged in current view.</p>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* 5. Operational Performance Charts Desk */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="charts-panel">
            
            {/* Chart 1: Weekly Revenue Trend */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="trend-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Weekly Revenue Trend</h3>
                <p className="text-[10px] text-slate-400">Chronological historical net sales vs budget targets</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-48" id="trend-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.weeklyTrend}
                      margin={{ top: 10, right: 5, bottom: 0, left: -25 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        labelFormatter={(label) => `Week Starting: ${label}`}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, undefined]}
                      />
                      <Area type="monotone" dataKey="netSales" name="Weekly Net Sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                      <Line type="monotone" dataKey="salesTarget" name="Weekly Target" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between items-center mt-4 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Chronological Weeks: {metrics.weeklyTrend.length}</span>
                  <span className="flex items-center text-indigo-600 font-bold">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Dynamic Scaling
                  </span>
                </div>
              </div>
            </div>

            {/* Chart 2: Sales & Targets by Region */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="regional-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Regional Revenue vs Target</h3>
                <p className="text-[10px] text-slate-400">Net revenue compared side-by-side with budgets</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-48" id="regional-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.regionalPerformance}
                      margin={{ top: 10, right: 5, bottom: 0, left: -25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="region" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, undefined]}
                      />
                      <Bar dataKey="netSales" name="Net Sales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="salesTarget" name="Budget Target" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between items-center mt-4 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Regions: {metrics.regionalPerformance.length}</span>
                  <span className="text-emerald-600 font-bold">Budget Comparisons</span>
                </div>
              </div>
            </div>

            {/* Chart 3: Product Category Performance */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="category-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Product Category Performance</h3>
                <p className="text-[10px] text-slate-400">Revenue split and volume by product category</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-48" id="category-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.categoryPerformance}
                      layout="vertical"
                      margin={{ top: 0, right: 10, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal stroke="#f1f5f9" vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={85} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, undefined]}
                      />
                      <Bar dataKey="netSales" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 mt-2" id="category-mini-legend">
                  {metrics.categoryPerformance.slice(0, 3).map((cat) => (
                    <div key={cat.category} className="flex justify-between text-[11px] text-slate-500">
                      <span className="font-semibold truncate max-w-[120px]">{cat.category}</span>
                      <span>{formatValue(cat.netSales)} <span className="font-mono text-[9px] text-slate-400">({cat.returnRate.toFixed(1)}% ret)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Store Leaderboard */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="leaderboard-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Store Performance Leaderboard</h3>
                <p className="text-[10px] text-slate-400">Top 8 stores by Net Revenue contribution</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-48" id="leaderboard-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={leaderboardData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="store_name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={90} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, undefined]}
                      />
                      <Bar dataKey="netSales" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Top Store: {leaderboardData[0]?.store_name || "N/A"}</span>
                  <span className="text-emerald-600 font-bold">Leaders Sorted</span>
                </div>
              </div>
            </div>

            {/* Chart 5: Supply Chain Stockout Risks */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="stockouts-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Weekly Stockout Incidents</h3>
                <p className="text-[10px] text-slate-400">Supply chain stockout risk pacing over weeks</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-48" id="stockouts-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics.weeklyTrend}
                      margin={{ top: 15, right: 10, bottom: 0, left: -25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        labelFormatter={(label) => `Week Starting: ${label}`}
                      />
                      <Line type="monotone" dataKey="stockouts" name="Weekly Stockouts" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, stroke: "#f59e0b", strokeWidth: 1, fill: "#fff" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Total stockout incidents: {metrics.totalStockouts}</span>
                  <span className="text-amber-600 font-bold">Supply Chain Risk</span>
                </div>
              </div>
            </div>

            {/* Chart 6: Store Format Contribution Share */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-indigo-300/40 hover:-translate-y-0.5 transition-all duration-300" id="format-card">
              <div className="p-5 border-b border-slate-100/80 bg-slate-50/40">
                <h3 className="font-bold text-slate-800 text-sm">Store Format Share</h3>
                <p className="text-[10px] text-slate-400">Revenue split across operational store sizes</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="h-32" id="format-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.formatPerformance}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="netSales"
                      >
                        {metrics.formatPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PASTEL[index % COLORS_PASTEL.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none" }}
                        itemStyle={{ color: "#fff", fontSize: "11px" }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, undefined]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-1 mt-2" id="format-mini-legend">
                  {metrics.formatPerformance.map((entry, index) => (
                    <div key={entry.format} className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5 truncate max-w-[150px]">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS_PASTEL[index % COLORS_PASTEL.length] }}></span>
                        <span className="font-medium truncate">{entry.format}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{((entry.netSales / metrics.totalNetSales) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* 6. Store Performance Audit Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="store-ledger-section">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="ledger-header">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Store Performance Audit Ledger</h2>
                <p className="text-[10px] text-slate-400">Sort, isolate, and audit store performance under current active filters</p>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-indigo-600">{tableStoresList.length}</span> venues
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto" id="ledger-table-container">
              <table className="w-full text-left border-collapse" id="ledger-table">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-mono cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("store_id")}>
                      <div className="flex items-center space-x-1.5">
                        <span>ID</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("store_name")}>
                      <div className="flex items-center space-x-1.5">
                        <span>Store Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("region")}>
                      <div className="flex items-center space-x-1.5">
                        <span>Region</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("store_format")}>
                      <div className="flex items-center space-x-1.5">
                        <span>Format</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-right cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("netSales")}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <span>Net Revenue</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-right cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("achievementRate")}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <span>Target Achieved</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("stockouts")}>
                      <div className="flex items-center justify-center space-x-1.5">
                        <span>Stockouts</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort("avgRating")}>
                      <div className="flex items-center justify-center space-x-1.5">
                        <span>Rating</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs" id="ledger-table-body">
                  {tableStoresList.length > 0 ? (
                    tableStoresList.map((store) => (
                      <tr key={store.store_id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 font-mono font-medium text-slate-400">{store.store_id}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800">{store.store_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{store.city}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {store.region}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium">{store.store_format}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                          {formatValue(store.netSales)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] ${
                            store.achievementRate >= 100
                              ? "bg-emerald-50 text-emerald-800"
                              : store.achievementRate >= 90
                              ? "bg-indigo-50 text-indigo-800"
                              : "bg-red-50 text-red-800"
                          }`}>
                            {store.achievementRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-mono font-semibold ${store.stockouts > 10 ? "text-red-600 font-bold" : store.stockouts > 0 ? "text-amber-600" : "text-slate-400"}`}>
                            {store.stockouts}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="font-bold text-slate-700">{store.avgRating.toFixed(1)}</span>
                            <Star className={`h-3 w-3 ${store.avgRating >= 4.4 ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                        No stores matched current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-right text-[10px] text-slate-400" id="table-footer">
              Audit log completed on {tableStoresList.length} integrated venues
            </div>
          </div>
        </>
      )}

    </div>
  );
}
