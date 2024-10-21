import express, { Router } from "express";
import { getScrapingStatus, startScraping } from "./scrapeController";

const router: Router = express.Router();

router.post("/start/:dataId", startScraping);

router.get("/status/:jobId", getScrapingStatus);

router.get("/result/:jobId", getScrapingStatus);

export default router;
