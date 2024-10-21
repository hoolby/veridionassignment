import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import scrapeRoutes from "@/api/scrape/scrapeRoutes";
import uploadRoutes from "@/api/upload/uploadRoutes";
import errorHandler from "@/middleware/errorHandler";
import rateLimiter from "@/middleware/rateLimiter";
import requestLogger from "@/middleware/requestLogger";
import { env } from "@/utils/envConfig";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import ESClient from "./utils/elasticSearchClient";
const logger = pino({ name: "server start" });
const app: Express = express();

ESClient.ping()
  .then(() => {
    logger.info("Elasticsearch cluster is up!");
  })
  .catch((err: any) => {
    logger.error("Elasticsearch cluster is down!", err);
  });

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/health-check", healthCheckRouter);
app.use("/upload", uploadRoutes);
app.use("/scrape", scrapeRoutes);

// Error handlers
app.use(errorHandler());

export { app, logger };
