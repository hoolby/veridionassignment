import Bull from "bull";
import { spawn } from "child_process";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";

// In-memory job store
interface JobStatus {
  status: string;
  result: any;
  dataId: string;
}
const jobs: { [key: string]: JobStatus } = {};

// Queue to manage scraping jobs
const scrapeQueue = new Bull(
  "scraping",
  `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
);

scrapeQueue.process(async (job, done) => {
  job.progress(0);
  const { urls, jobId, dataId } = job.data;
  const outputFilePath = path.join(
    __dirname,
    "../../../",
    "data",
    "output",
    `${dataId}.output.json`
  );

  // Spawn the Scrapy process using runspider
  const scraper = spawn("scrapy", [
    "runspider",
    "scripts/scrape.py",
    "-a",
    `urls=${urls}`,
    "-a",
    `job_id=${jobId}`,
  ]);

  // Check if the process starts correctly
  scraper.on("error", (err) => {
    console.error(`Failed to start scraper process: ${err.message}`);
    jobs[jobId].status = "failed";
    jobs[jobId].dataId = dataId;
    done(new Error(`Failed to start scraper process: ${err.message}`));
  });
  // Listen for output from the scraper
  scraper.stdout.setEncoding("utf8");
  scraper.stdout.on("data", function (data) {
    //Here is where the output goes
    console.log(`SCRAPE LOG: ${data}`);
  });

  // Listen for errors from the scraper
  scraper.stderr.setEncoding("utf8");
  scraper.stderr.on("data", function (data) {
    console.log("STDERR: " + data);
  });
  // When the scraper process closes
  scraper.on("close", (code) => {
    if (code === 0) {
      // Mark job as completed and store result file path
      jobs[jobId].status = "completed";
      jobs[jobId].dataId = dataId;
      jobs[jobId].result = outputFilePath;
      done(); // Mark the job as done in Bull queue
    } else {
      // Mark job as failed if the scraper process exits with a non-zero code
      jobs[jobId].status = "failed";
      jobs[jobId].dataId = dataId;
      done(new Error(`Job ${jobId} failed with code ${code}`));
    }
  });
});

// Example to ping the elasticsearch server

export const startScraping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dataId } = req.params;
    let websites: string[] = JSON.parse(
      fs.readFileSync(`output/${dataId}.data.json`, "utf-8")
    );
    websites = websites.slice(0, 10);
    const urls = websites.map((website) => website);

    if (!urls || !urls.length) {
      res.status(400).json({ error: "URLs are required" });
    }

    // Generate a unique job ID
    const timestamp = `${Date.now()}`;

    console.log(`STARTING ${timestamp}, WITH ${urls.length} URLS`);
    // Add job to the queue
    scrapeQueue.add({ urls, jobId: timestamp, dataId });

    // Store the job status as 'pending'
    jobs[timestamp] = { status: "pending", result: null, dataId };

    res.status(202).json({ jobId: timestamp, dataId });
  } catch (error) {
    console.error(`Error starting scraping: ${error}`);
    res.status(500).json({ message: "Internal server error." });
    next(error);
  }
};

export const getScrapingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const status = jobs[jobId] || null;
    if (!status) {
      res.status(404).json({ message: "Job not found." });
      return;
    }
    res.status(200).json(status);
  } catch (error) {
    console.error(`Error fetching scraping status: ${error}`);
    res.status(500).json({ message: "Internal server error." });
  }
};
