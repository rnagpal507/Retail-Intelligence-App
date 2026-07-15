import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google Gemini SDK
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("Gemini API Client initialized successfully.");
} else {
  console.warn("GEMINI_API_KEY is not defined in the environment. AI summaries will fall back to local heuristics.");
}

// AI Summary Endpoint
app.post("/api/summary", async (req, res) => {
  try {
    const { dataSummary } = req.body;

    if (!dataSummary) {
      return res.status(400).json({ error: "Missing dataSummary payload" });
    }

    if (!ai) {
      const netSales = dataSummary.totalNetSales || 0;
      const salesTarget = dataSummary.totalSalesTarget || 0;
      const rating = dataSummary.avgCustomerRating || 0;
      const transactions = dataSummary.totalTransactions || 0;
      const stockouts = dataSummary.totalStockouts || 0;
      const returns = dataSummary.totalReturns || 0;
      const marketing = dataSummary.totalMarketingSpend || 0;

      return res.json({
        summary: `### Executive Retail Insights (Local Baseline)
Due to GEMINI_API_KEY not being configured yet, this is an automated heuristic baseline summary.

*   **Overall Financial Performance**: Total revenue is **₹${netSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}** against a target of **₹${salesTarget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}**, representing a **${((netSales / (salesTarget || 1)) * 100).toFixed(1)}%** target achievement rate.
*   **Customer Engagement**: Customers awarded an average rating of **${rating.toFixed(2)} / 5.0** across **${transactions.toLocaleString()}** transactions, showing steady shopper sentiment.
*   **Supply Chain & Returns**: A total of **${stockouts}** stockout events were flagged. Returns reached **₹${returns.toLocaleString("en-IN", { maximumFractionDigits: 0 })}**, which represents **${((returns / (netSales || 1)) * 100).toFixed(1)}%** of overall net sales.
*   **Marketing Efficiency**: ROI of marketing spend yields **${((netSales - marketing) / (marketing || 1)).toFixed(1)}x** net returns based on a strategic budget of **₹${marketing.toLocaleString("en-IN", { maximumFractionDigits: 0 })}**.

*To activate custom executive analysis and deep regional audits, configure your **GEMINI_API_KEY** under **Settings > Secrets**.*`
      });
    }

    const prompt = `
You are a top-tier Principal Retail Consultant and McKinsey Analytics Partner. You have been provided with an aggregated summary of weekly retail sales data across a chain of stores.
Analyze this data and generate a highly polished, action-oriented, and strategic executive business summary.

All monetary values in the dataset are in Indian Rupees (INR / ₹). Ensure that you write all monetary numbers using the ₹ symbol and Indian formatting in your response.

Here is the aggregated chain performance data:
${JSON.stringify(dataSummary, null, 2)}

Your executive summary should be formatted as structured, elegant Markdown. Focus on driving decision-making for retail directors. Do NOT use dry, boring, or generic summaries.
Include:
1. **Executive Keynotes (The Big Picture)**: 2-3 sentences summing up the overall financial health, target achievements, and critical performance indicators. Use actual numbers from the data.
2. **Top Regional Opportunities & Leaks**: Pinpoint which regions are exceeding expectations and which ones are leaking margin (e.g., high return rates, underachieving sales targets, high discount amounts relative to net sales, or high stockouts).
3. **Format & Category Optimization**: Actionable recommendations on specific store formats (e.g., Boutique vs Hypermarket) and product categories.
4. **Immediate Operational Tactics**: 3-4 specific, concrete bullets about:
   - Inventory management / Stockouts mitigation (tie to specific regions/formats with high stockouts)
   - Discount strategy adjustments
   - Marketing ROI optimization (targeting spend where footfall/net sales ROI is highest)
   - Improving customer ratings and handling returns.

Keep the tone professional, direct, analytical, and highly action-oriented. Bold key terms and metrics. Avoid referencing JSON structures or technical jargon; speak as if presenting in a boardroom.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to generate AI summary", details: error.message });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
