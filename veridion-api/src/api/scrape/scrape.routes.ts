import express, { Router } from "express";
import { getScrapingStatus, startScraping } from "./scrape.controller";

const router: Router = express.Router();

router.post("/start", startScraping);

router.get("/status/:jobId", getScrapingStatus);

router.get("/result/:jobId", getScrapingStatus);

export default router;
