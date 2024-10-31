import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import queryRoutes from "@/api/query/query.routes";
import scrapeRoutes from "@/api/scrape/scrape.routes";
import uploadRoutes from "@/api/upload/upload.routes";
import errorHandler from "@/middleware/errorHandler";
import rateLimiter from "@/middleware/rateLimiter";
import requestLogger from "@/middleware/requestLogger";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { createIndexIfNotExists, pingES } from "./utils/elasticSearchClient";
const logger = pino({ name: "server start" });
const app: Express = express();

pingES();
createIndexIfNotExists("domains");
createIndexIfNotExists("jobs");

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/health-check", healthCheckRouter);
app.use("/upload", uploadRoutes);
app.use("/scrape", scrapeRoutes);
app.use("/query", queryRoutes);

// Error handlers
app.use(errorHandler());

export { app, logger };
