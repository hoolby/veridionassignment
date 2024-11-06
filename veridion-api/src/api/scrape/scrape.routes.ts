import express, { Router } from "express";
import {
  analyzeDomains,
  getScrapingStatus,
  startScraping,
} from "./scrape.controller";

const router: Router = express.Router();

router.post("/start", startScraping);

router.get("/status/:jobId", getScrapingStatus);

export default router;
