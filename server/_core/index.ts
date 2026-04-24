import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDealsStats, getDealsList, getEngineersKPI, getDb } from "../db";
import { deals, engineers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust proxy headers (needed for HTTPS detection behind reverse proxy)
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ─── CORS for public REST endpoints ────────────────────────────────────────
  app.use("/api/summary", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use("/api/list", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use("/api/kpi", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // ─── GET /api/summary ────────────────────────────────────────────────────────
  // Returns: total_deals, closed_deals, closing_rate, total_revenue
  app.get("/api/summary", async (_req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const stats = await getDealsStats(year, month);
      const total_deals = stats.open + stats.closedWon + stats.closedLost;
      const closed_deals = stats.closedWon;
      const closing_rate = total_deals > 0
        ? Math.round((closed_deals / total_deals) * 10000) / 100
        : 0;
      res.json({
        total_deals,
        closed_deals,
        closing_rate,
        total_revenue: stats.closedValue,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── GET /api/list ────────────────────────────────────────────────────────────
  // Returns: deals list (id, client_name, value, status, assigned_engineer)
  app.get("/api/list", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const stage = req.query.stage as string | undefined;
      // Fetch deals with engineer name via join
      const rows = await db
        .select({
          id: deals.id,
          client_name: deals.clientName,
          value: deals.value,
          status: deals.stage,
          engineer_id: deals.engineerId,
          engineer_name: engineers.name,
          created_at: deals.createdAt,
          closed_at: deals.closedAt,
        })
        .from(deals)
        .leftJoin(engineers, eq(deals.engineerId, engineers.id))
        .where(stage ? eq(deals.stage, stage as any) : undefined)
        .orderBy(deals.createdAt)
        .limit(limit)
        .offset(offset);
      res.json({
        count: rows.length,
        offset,
        limit,
        deals: rows.map(r => ({
          id: r.id,
          client_name: r.client_name,
          value: parseFloat(r.value),
          status: r.status,
          assigned_engineer: r.engineer_name ?? `engineer_${r.engineer_id}`,
        })),
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── GET /api/kpi ─────────────────────────────────────────────────────────────
  // Returns: performance per engineer (engineer_id, deals_closed, revenue, closing_rate)
  app.get("/api/kpi", async (req, res) => {
    try {
      const now = new Date();
      const year = parseInt(req.query.year as string) || now.getFullYear();
      const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
      const kpiData = await getEngineersKPI(year, month);
      res.json({
        year,
        month,
        engineers: kpiData.map(eng => ({
          engineer_id: eng.engineerId,
          engineer_name: eng.engineerName,
          deals_closed: eng.closedWon,
          revenue: eng.totalDealValue,
          closing_rate: eng.achievementPct,
          kpi_score: eng.kpiScore,
          kpi_rank: eng.kpiRank,
          rating: eng.rating,
        })),
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
