export interface SalesRecord {
  week_start_date: string;
  region: string;
  store_id: string;
  store_name: string;
  city: string;
  store_format: string;
  product_category: string;
  footfall: number;
  transactions: number;
  units_sold: number;
  gross_sales: number;
  discount_amount: number;
  net_sales: number;
  sales_target: number;
  inventory_on_hand: number;
  stockouts: number;
  returns_amount: number;
  customer_rating: number;
  marketing_spend: number;
}

export interface StoreMaster {
  store_id: string;
  store_name: string;
  region: string;
  city: string;
  store_format: string;
}

export interface JoinedRecord extends SalesRecord {
  storeMasterMatch?: boolean;
}

export interface ValidationSummary {
  fileName: string;
  rowCount: number;
  columnsPresent: string[];
  missingColumns: string[];
  nullCount: number;
  nullFieldsSummary: Record<string, number>;
  isValid: boolean;
}

export interface AggregatedMetrics {
  totalNetSales: number;
  totalGrossSales: number;
  totalDiscountAmount: number;
  totalSalesTarget: number;
  totalUnitsSold: number;
  totalTransactions: number;
  totalFootfall: number;
  totalReturns: number;
  totalMarketingSpend: number;
  totalStockouts: number;
  avgCustomerRating: number;
  achievementRate: number;
  marketingROI: number;
  stockoutRate: number;
  returnsPct: number;
  atv: number;
  discountRate: number;
  
  regionalPerformance: Array<{
    region: string;
    netSales: number;
    salesTarget: number;
    achievementRate: number;
    unitsSold: number;
    transactions: number;
    footfall: number;
    stockouts: number;
    returns: number;
    marketing: number;
    avgRating: number;
    marketingROI: number;
  }>;
  
  formatPerformance: Array<{
    format: string;
    netSales: number;
    salesTarget: number;
    achievementRate: number;
    transactions: number;
    unitsSold: number;
    returns: number;
    footfall: number;
  }>;
  
  categoryPerformance: Array<{
    category: string;
    netSales: number;
    unitsSold: number;
    grossSales: number;
    returns: number;
    returnRate: number;
  }>;

  weeklyTrend: Array<{
    week: string;
    netSales: number;
    salesTarget: number;
    unitsSold: number;
    stockouts: number;
  }>;
  
  storePerformance: Array<{
    store_id: string;
    store_name: string;
    region: string;
    city: string;
    store_format: string;
    netSales: number;
    salesTarget: number;
    achievementRate: number;
    stockouts: number;
    avgRating: number;
  }>;
}
