import { SalesRecord, StoreMaster } from "./types";

// Setup 20 master stores across 5 regions
export const SAMPLE_STORES: StoreMaster[] = [
  { store_id: "STR-101", store_name: "Broadway Elite", region: "East", city: "New York", store_format: "Boutique" },
  { store_id: "STR-102", store_name: "Atlantic Hub", region: "East", city: "Boston", store_format: "Department Store" },
  { store_id: "STR-103", store_name: "Hub City Express", region: "East", city: "Philadelphia", store_format: "Express" },
  { store_id: "STR-104", store_name: "Quincy Bazaar", region: "East", city: "Boston", store_format: "Supermarket" },
  
  { store_id: "STR-105", store_name: "Pacific Coast Hyper", region: "West", city: "Los Angeles", store_format: "Hypermarket" },
  { store_id: "STR-106", store_name: "Sunset Blvd Boutique", region: "West", city: "Los Angeles", store_format: "Boutique" },
  { store_id: "STR-107", store_name: "Silicon Valley Express", region: "West", city: "San Francisco", store_format: "Express" },
  { store_id: "STR-108", store_name: "Emerald Canopy", region: "West", city: "Seattle", store_format: "Supermarket" },
  
  { store_id: "STR-109", store_name: "Windy City Super", region: "North", city: "Chicago", store_format: "Supermarket" },
  { store_id: "STR-110", store_name: "Great Lakes Market", region: "North", city: "Detroit", store_format: "Hypermarket" },
  { store_id: "STR-111", store_name: "Twin Cities Plaza", region: "North", city: "Minneapolis", store_format: "Department Store" },
  { store_id: "STR-112", store_name: "Motor City Center", region: "North", city: "Detroit", store_format: "Express" },
  
  { store_id: "STR-113", store_name: "Peachtree Plaza", region: "South", city: "Atlanta", store_format: "Supermarket" },
  { store_id: "STR-114", store_name: "Brickell Avenue Premium", region: "South", city: "Miami", store_format: "Boutique" },
  { store_id: "STR-115", store_name: "Lone Star Hypermarket", region: "South", city: "Houston", store_format: "Hypermarket" },
  { store_id: "STR-116", store_name: "Space City Outlet", region: "South", city: "Dallas", store_format: "Department Store" },
  
  { store_id: "STR-117", store_name: "Mile High Emporium", region: "Central", city: "Denver", store_format: "Department Store" },
  { store_id: "STR-118", store_name: "Plaza Centro", region: "Central", city: "Kansas City", store_format: "Supermarket" },
  { store_id: "STR-119", store_name: "Gateway Arch Depot", region: "Central", city: "St. Louis", store_format: "Hypermarket" },
  { store_id: "STR-120", store_name: "Crown Center Market", region: "Central", city: "Kansas City", store_format: "Express" },
];

const CATEGORIES = [
  "Electronics",
  "Apparel",
  "Groceries",
  "Home & Kitchen",
  "Beauty & Personal Care",
];

// Helper to generate deterministic random values based on seed
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateSampleSales(): SalesRecord[] {
  const sales: SalesRecord[] = [];
  const totalWeeks = 96;
  
  // Calculate Sunday week start dates going backwards
  const dates: string[] = [];
  const currentDate = new Date("2026-07-12"); // Most recent week start (Sunday)
  
  for (let w = 0; w < totalWeeks; w++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - w * 7);
    dates.unshift(d.toISOString().split("T")[0]); // chronological order
  }
  
  let seedVal = 12345;
  
  for (let w = 0; w < totalWeeks; w++) {
    const dateStr = dates[w];
    // Add some seasonality factor (higher sales around winter holidays and summer peaks)
    const month = parseInt(dateStr.split("-")[1], 10);
    let seasonality = 1.0;
    if (month === 11 || month === 12) seasonality = 1.25; // Nov, Dec Holiday rush
    if (month === 6 || month === 7) seasonality = 1.1;    // Summer peak
    if (month === 1 || month === 2) seasonality = 0.85;   // Winter slowdown
    
    for (let s = 0; s < SAMPLE_STORES.length; s++) {
      const store = SAMPLE_STORES[s];
      
      seedVal += 1;
      const r1 = seededRandom(seedVal);
      seedVal += 1;
      const r2 = seededRandom(seedVal);
      seedVal += 1;
      const r3 = seededRandom(seedVal);
      seedVal += 1;
      const r4 = seededRandom(seedVal);
      seedVal += 1;
      const r5 = seededRandom(seedVal);
      seedVal += 1;
      const r6 = seededRandom(seedVal);
      
      // Determine base sizing by store format
      let baseFootfall = 3500;
      let baseTicketPrice = 45;
      
      if (store.store_format === "Hypermarket") {
        baseFootfall = 11000;
        baseTicketPrice = 65;
      } else if (store.store_format === "Supermarket") {
        baseFootfall = 7500;
        baseTicketPrice = 35;
      } else if (store.store_format === "Department Store") {
        baseFootfall = 5000;
        baseTicketPrice = 80;
      } else if (store.store_format === "Boutique") {
        baseFootfall = 1800;
        baseTicketPrice = 120;
      } else if (store.store_format === "Express") {
        baseFootfall = 2800;
        baseTicketPrice = 22;
      }
      
      // Weekly fluctuations
      const weekFootfall = Math.round(baseFootfall * (0.85 + r1 * 0.3) * seasonality);
      const conversionRate = 0.38 + r2 * 0.12; // 38% - 50%
      const transactions = Math.round(weekFootfall * conversionRate);
      
      const avgUnitsPerTx = store.store_format === "Boutique" ? 1.4 : store.store_format === "Hypermarket" ? 4.5 : 2.5;
      const units_sold = Math.round(transactions * (avgUnitsPerTx + (r3 - 0.5) * 0.6));
      
      const gross_sales = parseFloat((units_sold * (baseTicketPrice / avgUnitsPerTx) * (0.9 + r4 * 0.2)).toFixed(2));
      const discount_rate = store.store_format === "Boutique" ? 0.05 + r5 * 0.1 : 0.12 + r5 * 0.15; // boutiques discount less
      const discount_amount = parseFloat((gross_sales * discount_rate).toFixed(2));
      const net_sales = parseFloat((gross_sales - discount_amount).toFixed(2));
      
      // Set target slightly challenging, based on chronological growth
      const growthTrend = 1.0 + (w / totalWeeks) * 0.15; // 15% target growth over 2 years
      const sales_target = parseFloat((baseFootfall * conversionRate * (baseTicketPrice / avgUnitsPerTx) * avgUnitsPerTx * growthTrend * 0.95).toFixed(2));
      
      const inventory_on_hand = Math.round(units_sold * (2.0 + r6 * 1.5));
      
      // Stockout risk rises with lower inventory-to-sales ratios
      const invRatio = inventory_on_hand / (units_sold || 1);
      let stockouts = 0;
      if (invRatio < 2.2) stockouts = Math.round(r1 * 4);
      else if (invRatio < 2.8) stockouts = Math.round(r1 * 2);
      
      const returns_amount = parseFloat((net_sales * (0.01 + r2 * 0.04)).toFixed(2));
      
      // Ratings: East and Boutiques generally higher
      let baseRating = 4.1;
      if (store.store_format === "Boutique") baseRating = 4.5;
      if (store.region === "East") baseRating += 0.2;
      if (store.region === "South") baseRating -= 0.1;
      const customer_rating = parseFloat(Math.min(5.0, Math.max(1.0, baseRating + (r3 - 0.5) * 0.8)).toFixed(1));
      
      // Marketing spend: heavier in Express and Supermarkets, lower in Boutiques
      const marketingSpendPct = store.store_format === "Express" ? 0.08 : store.store_format === "Boutique" ? 0.03 : 0.05;
      const marketing_spend = parseFloat((net_sales * marketingSpendPct * (0.7 + r4 * 0.6)).toFixed(2));
      
      // Primary category for this week's records
      const category = CATEGORIES[(w + s) % CATEGORIES.length];
      
      sales.push({
        week_start_date: dateStr,
        region: store.region,
        store_id: store.store_id,
        store_name: store.store_name,
        city: store.city,
        store_format: store.store_format,
        product_category: category,
        footfall: weekFootfall,
        transactions,
        units_sold,
        gross_sales,
        discount_amount,
        net_sales,
        sales_target,
        inventory_on_hand,
        stockouts,
        returns_amount,
        customer_rating,
        marketing_spend,
      });
    }
  }
  
  return sales;
}
