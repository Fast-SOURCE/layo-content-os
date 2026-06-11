import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static files in production
// In Vercel serverless, __dirname points to the function directory
// The dist/public files are included via includeFiles config
const distPath = path.resolve(__dirname, "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  // Fallback: try relative to process.cwd()
  const cwdDistPath = path.resolve(process.cwd(), "dist", "public");
  if (fs.existsSync(cwdDistPath)) {
    app.use(express.static(cwdDistPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(cwdDistPath, "index.html"));
    });
  } else {
    app.use("*", (_req, res) => {
      res.status(404).send("Static files not found. Build the frontend first.");
    });
  }
}

export default app;
