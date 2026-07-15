import * as XLSX from "xlsx";
import { SalesRecord, StoreMaster, ValidationSummary, AggregatedMetrics } from "../types";

// Standard column names for validation
const SALES_REQUIRED_COLUMNS = [
  "week_start_date",
  "region",
  "store_id",
  "store_name",
  "city",
  "store_format",
  "product_category",
  "footfall",
  "transactions",
  "units_sold",
  "gross_sales",
  "discount_amount",
  "net_sales",
  "sales_target",
  "inventory_on_hand",
  "stockouts",
  "returns_amount",
  "customer_rating",
  "marketing_spend",
];

const STORE_REQUIRED_COLUMNS = [
  "store_id",
  "store_name",
  "region",
  "city",
  "store_format",
];

// Helper to normalize column headers
export function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w]/g, ""); // strip anything else like emojis, special chars
}

// Helper to normalize dates to YYYY-MM-DD from Excel formats, Date objects, etc.
export function formatDateValue(value: any): string {
  if (value === null || value === undefined) return "N/A";
  if (value instanceof Date) {
    try {
      return value.toISOString().split("T")[0];
    } catch (e) {
      return String(value);
    }
  }
  // If it's a number, it might be an Excel date serial
  if (typeof value === "number") {
    if (value > 30000 && value < 60000) {
      try {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split("T")[0];
      } catch (e) {
        return String(value);
      }
    }
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Try parsing other formats
  try {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split("T")[0];
    }
  } catch (e) {
    // Ignore and return string
  }
  return str;
}

export function parseAndValidateSpreadsheet(
  file: File,
  type: "sales" | "stores"
): Promise<{
  data: any[];
  summary: ValidationSummary;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataBuffer = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataBuffer, { type: "array" });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error("No sheets found in the uploaded file.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers as keys
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });
        
        if (rawRows.length === 0) {
          throw new Error("The uploaded sheet is empty.");
        }

        // Extract first row keys for header validation
        const firstRow = rawRows[0];
        const originalHeaders = Object.keys(firstRow);
        const normalizedHeadersMap: Record<string, string> = {};
        const columnsPresent: string[] = [];

        originalHeaders.forEach((header) => {
          const norm = normalizeHeader(header);
          normalizedHeadersMap[header] = norm;
          columnsPresent.push(norm);
        });

        const targetRequired = type === "sales" ? SALES_REQUIRED_COLUMNS : STORE_REQUIRED_COLUMNS;
        const missingColumns = targetRequired.filter((col) => !columnsPresent.includes(col));

        // Create normalized rows and count nulls
        const nullFieldsSummary: Record<string, number> = {};
        targetRequired.forEach((col) => {
          nullFieldsSummary[col] = 0;
        });

        let nullCount = 0;
        const parsedRows = rawRows.map((row) => {
          const normalizedRow: Record<string, any> = {};
          
          // Map original keys to normalized keys
          originalHeaders.forEach((key) => {
            const normKey = normalizedHeadersMap[key];
            let value = row[key];
            
            // Convert numbers if possible for metrics columns
            if (value !== null && value !== undefined) {
              const strVal = value.toString().trim();
              if (strVal === "" || strVal.toLowerCase() === "null" || strVal.toLowerCase() === "na") {
                value = null;
              } else if (!isNaN(Number(strVal)) && normKey !== "store_id" && normKey !== "week_start_date") {
                value = Number(strVal);
              }
            } else {
              value = null;
            }
            
            if (normKey === "week_start_date" && value !== null && value !== undefined) {
              value = formatDateValue(value);
            }
            
            normalizedRow[normKey] = value;
          });

          // Check required fields for null values
          targetRequired.forEach((col) => {
            const val = normalizedRow[col];
            if (val === null || val === undefined || val === "") {
              nullCount++;
              nullFieldsSummary[col] = (nullFieldsSummary[col] || 0) + 1;
              
              // Fill with default values to prevent dashboard crash
              if (type === "sales") {
                if (["footfall", "transactions", "units_sold", "gross_sales", "discount_amount", "net_sales", "sales_target", "inventory_on_hand", "stockouts", "returns_amount", "customer_rating", "marketing_spend"].includes(col)) {
                  normalizedRow[col] = 0;
                } else {
                  normalizedRow[col] = "N/A";
                }
              } else {
                normalizedRow[col] = "N/A";
              }
            }
          });

          return normalizedRow;
        });

        // Consider it invalid if critical columns are missing
        const isValid = missingColumns.length === 0;

        const summary: ValidationSummary = {
          fileName: file.name,
          rowCount: parsedRows.length,
          columnsPresent,
          missingColumns,
          nullCount,
          nullFieldsSummary,
          isValid,
        };

        resolve({ data: parsedRows, summary });
      } catch (err: any) {
        reject(new Error(`Failed to parse file: ${err.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("File reading error occurred."));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function joinDatasets(
  salesData: SalesRecord[],
  storeMaster: StoreMaster[]
): {
  joinedData: SalesRecord[];
  matchedCount: number;
  unmatchedCount: number;
  unmatchedStoreIds: string[];
} {
  const storeMap = new Map<string, StoreMaster>();
  storeMaster.forEach((store) => {
    storeMap.set(store.store_id.toString().trim().toUpperCase(), store);
  });

  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedStoreIdsSet = new Set<string>();

  const joinedData = salesData.map((sale) => {
    const saleStoreId = sale.store_id ? sale.store_id.toString().trim().toUpperCase() : "";
    const matchedStore = storeMap.get(saleStoreId);

    if (matchedStore) {
      matchedCount++;
      return {
        ...sale,
        // Enforce or enrich values from store master for reliability
        store_name: matchedStore.store_name,
        region: matchedStore.region,
        city: matchedStore.city,
        store_format: matchedStore.store_format,
        storeMasterMatch: true,
      };
    } else {
      unmatchedCount++;
      if (sale.store_id) {
        unmatchedStoreIdsSet.add(sale.store_id.toString());
      }
      return {
        ...sale,
        storeMasterMatch: false,
      };
    }
  });

  return {
    joinedData,
    matchedCount,
    unmatchedCount,
    unmatchedStoreIds: Array.from(unmatchedStoreIdsSet),
  };
}

export function aggregateRetailData(data: SalesRecord[]): AggregatedMetrics {
  let totalNetSales = 0;
  let totalGrossSales = 0;
  let totalDiscountAmount = 0;
  let totalSalesTarget = 0;
  let totalUnitsSold = 0;
  let totalTransactions = 0;
  let totalFootfall = 0;
  let totalReturns = 0;
  let totalMarketingSpend = 0;
  let totalStockouts = 0;
  let totalRatingSum = 0;
  let totalRatingCount = 0;

  // Temp storage for trends
  const weeklyMap: Record<string, { week: string; netSales: number; salesTarget: number; unitsSold: number; stockouts: number }> = {};
  const regionalMap: Record<string, any> = {};
  const formatMap: Record<string, any> = {};
  const categoryMap: Record<string, any> = {};
  const storeMap: Record<string, any> = {};

  data.forEach((row) => {
    const netSales = Number(row.net_sales) || 0;
    const grossSales = Number(row.gross_sales) || 0;
    const discount = Number(row.discount_amount) || 0;
    const target = Number(row.sales_target) || 0;
    const units = Number(row.units_sold) || 0;
    const tx = Number(row.transactions) || 0;
    const footfall = Number(row.footfall) || 0;
    const returns = Number(row.returns_amount) || 0;
    const marketing = Number(row.marketing_spend) || 0;
    const stockouts = Number(row.stockouts) || 0;
    const rating = Number(row.customer_rating) || 0;

    // Overall Accumulation
    totalNetSales += netSales;
    totalGrossSales += grossSales;
    totalDiscountAmount += discount;
    totalSalesTarget += target;
    totalUnitsSold += units;
    totalTransactions += tx;
    totalFootfall += footfall;
    totalReturns += returns;
    totalMarketingSpend += marketing;
    totalStockouts += stockouts;

    if (rating > 0) {
      totalRatingSum += rating;
      totalRatingCount++;
    }

    // Weekly trend aggregation
    let week = row.week_start_date;
    if (week) {
      week = formatDateValue(week);
      if (!weeklyMap[week]) {
        weeklyMap[week] = { week, netSales: 0, salesTarget: 0, unitsSold: 0, stockouts: 0 };
      }
      weeklyMap[week].netSales += netSales;
      weeklyMap[week].salesTarget += target;
      weeklyMap[week].unitsSold += units;
      weeklyMap[week].stockouts += stockouts;
    }

    // Regional aggregation
    const region = row.region || "Unassigned";
    if (!regionalMap[region]) {
      regionalMap[region] = {
        region, netSales: 0, salesTarget: 0, unitsSold: 0, transactions: 0,
        footfall: 0, stockouts: 0, returns: 0, marketing: 0, ratingsSum: 0, ratingsCount: 0
      };
    }
    regionalMap[region].netSales += netSales;
    regionalMap[region].salesTarget += target;
    regionalMap[region].unitsSold += units;
    regionalMap[region].transactions += tx;
    regionalMap[region].footfall += footfall;
    regionalMap[region].stockouts += stockouts;
    regionalMap[region].returns += returns;
    regionalMap[region].marketing += marketing;
    if (rating > 0) {
      regionalMap[region].ratingsSum += rating;
      regionalMap[region].ratingsCount++;
    }

    // Format aggregation
    const format = row.store_format || "Unassigned";
    if (!formatMap[format]) {
      formatMap[format] = {
        format, netSales: 0, salesTarget: 0, transactions: 0, unitsSold: 0, returns: 0, footfall: 0
      };
    }
    formatMap[format].netSales += netSales;
    formatMap[format].salesTarget += target;
    formatMap[format].transactions += tx;
    formatMap[format].unitsSold += units;
    formatMap[format].returns += returns;
    formatMap[format].footfall += footfall;

    // Category aggregation
    const category = row.product_category || "Unassigned";
    if (!categoryMap[category]) {
      categoryMap[category] = { category, netSales: 0, unitsSold: 0, grossSales: 0, returns: 0 };
    }
    categoryMap[category].netSales += netSales;
    categoryMap[category].unitsSold += units;
    categoryMap[category].grossSales += grossSales;
    categoryMap[category].returns += returns;

    // Store level aggregation
    const storeId = row.store_id;
    if (storeId) {
      if (!storeMap[storeId]) {
        storeMap[storeId] = {
          store_id: storeId,
          store_name: row.store_name || `Store ${storeId}`,
          region: region,
          city: row.city || "N/A",
          store_format: format,
          netSales: 0,
          salesTarget: 0,
          stockouts: 0,
          ratingsSum: 0,
          ratingsCount: 0,
        };
      }
      storeMap[storeId].netSales += netSales;
      storeMap[storeId].salesTarget += target;
      storeMap[storeId].stockouts += stockouts;
      if (rating > 0) {
        storeMap[storeId].ratingsSum += rating;
        storeMap[storeId].ratingsCount++;
      }
    }
  });

  // Post process collections
  const regionalPerformance = Object.values(regionalMap).map((reg: any) => ({
    region: reg.region,
    netSales: reg.netSales,
    salesTarget: reg.salesTarget,
    achievementRate: reg.salesTarget > 0 ? (reg.netSales / reg.salesTarget) * 100 : 0,
    unitsSold: reg.unitsSold,
    transactions: reg.transactions,
    footfall: reg.footfall,
    stockouts: reg.stockouts,
    returns: reg.returns,
    marketing: reg.marketing,
    avgRating: reg.ratingsCount > 0 ? reg.ratingsSum / reg.ratingsCount : 0,
    marketingROI: reg.marketing > 0 ? (reg.netSales - reg.marketing) / reg.marketing : 0,
  })).sort((a, b) => b.netSales - a.netSales);

  const formatPerformance = Object.values(formatMap).map((form: any) => ({
    format: form.format,
    netSales: form.netSales,
    salesTarget: form.salesTarget,
    achievementRate: form.salesTarget > 0 ? (form.netSales / form.salesTarget) * 100 : 0,
    transactions: form.transactions,
    unitsSold: form.unitsSold,
    returns: form.returns,
    footfall: form.footfall,
  })).sort((a, b) => b.netSales - a.netSales);

  const categoryPerformance = Object.values(categoryMap).map((cat: any) => ({
    category: cat.category,
    netSales: cat.netSales,
    unitsSold: cat.unitsSold,
    grossSales: cat.grossSales,
    returns: cat.returns,
    returnRate: cat.netSales > 0 ? (cat.returns / cat.netSales) * 100 : 0,
  })).sort((a, b) => b.netSales - a.netSales);

  const weeklyTrend = Object.values(weeklyMap).sort((a, b) => {
    const aVal = a.week ? String(a.week) : "";
    const bVal = b.week ? String(b.week) : "";
    return aVal.localeCompare(bVal);
  });

  const storePerformance = Object.values(storeMap).map((st: any) => ({
    store_id: st.store_id,
    store_name: st.store_name,
    region: st.region,
    city: st.city,
    store_format: st.store_format,
    netSales: st.netSales,
    salesTarget: st.salesTarget,
    achievementRate: st.salesTarget > 0 ? (st.netSales / st.salesTarget) * 100 : 0,
    stockouts: st.stockouts,
    avgRating: st.ratingsCount > 0 ? st.ratingsSum / st.ratingsCount : 0,
  })).sort((a, b) => b.netSales - a.netSales);

  const avgCustomerRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;
  const achievementRate = totalSalesTarget > 0 ? (totalNetSales / totalSalesTarget) * 100 : 0;
  const marketingROI = totalMarketingSpend > 0 ? (totalNetSales - totalMarketingSpend) / totalMarketingSpend : 0;
  const stockoutRate = data.length > 0 ? (totalStockouts / data.length) * 100 : 0;
  const returnsPct = totalNetSales > 0 ? (totalReturns / totalNetSales) * 100 : 0;
  const atv = totalTransactions > 0 ? totalNetSales / totalTransactions : 0;
  const discountRate = totalGrossSales > 0 ? (totalDiscountAmount / totalGrossSales) * 100 : 0;

  return {
    totalNetSales,
    totalGrossSales,
    totalDiscountAmount,
    totalSalesTarget,
    totalUnitsSold,
    totalTransactions,
    totalFootfall,
    totalReturns,
    totalMarketingSpend,
    totalStockouts,
    avgCustomerRating,
    achievementRate,
    marketingROI,
    stockoutRate,
    returnsPct,
    atv,
    discountRate,
    regionalPerformance,
    formatPerformance,
    categoryPerformance,
    weeklyTrend,
    storePerformance,
  };
}
