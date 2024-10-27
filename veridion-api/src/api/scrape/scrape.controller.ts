import ESClient from "@/utils/elasticSearchClient";
import Bull from "bull";
import { spawn } from "child_process";
import { NextFunction, Request, Response } from "express";

interface JobStatus {
  status: string;
  result: any[];
  progress: number;
  successfulDomains: number; // New field
  erroredDomains: number; // New field
}

const jobs: { [key: string]: JobStatus } = {};

const scrapeQueue = new Bull(
  "scraping",
  `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
);

scrapeQueue.process(async (job, done) => {
  const { urls, jobId } = job.data;

  const scraper = spawn("scrapy", [
    "runspider",
    "scripts/scrape.py",
    "-a",
    `urls=${urls}`,
    "-a",
    `job_id=${jobId}`,
  ]);

  scraper.stdout.setEncoding("utf8");
  scraper.stdout.on("data", async (data) => {
    if (data.startsWith("PARTIAL RESULT:")) {
      const resultData = JSON.parse(data.split("PARTIAL RESULT:")[1]);
      jobs[jobId].result.push(resultData);
      jobs[jobId].successfulDomains += 1; // Update success count

      jobs[jobId].progress = Math.round(
        ((jobs[jobId].successfulDomains + jobs[jobId].erroredDomains) /
          urls.split(",").length) *
          100
      );

      // Send real-time progress to client (using WebSocket or similar if available)
      console.log(`Progress for job ${jobId}: ${jobs[jobId].progress}%`);

      // Update Elasticsearch with each partial result
      try {
        await ESClient.update({
          index: "domains",
          id: resultData.url,
          body: { doc: resultData, doc_as_upsert: true },
        });
      } catch (err: any) {
        console.error(
          `Failed to update Elasticsearch for ${resultData.url}: ${err.message}`
        );
      }
    } else if (data.includes("SCRAPE SUCCESS:")) {
      jobs[jobId].status = "completed";
      done();
    }
  });

  scraper.stderr.on("data", (data) => {
    console.error("SCRAPE ERROR: " + data);

    if (data.includes("Error for")) {
      // Update error count
      jobs[jobId].erroredDomains += 1;
      jobs[jobId].progress = Math.round(
        ((jobs[jobId].successfulDomains + jobs[jobId].erroredDomains) /
          urls.split(",").length) *
          100
      );
    }
  });

  scraper.on("close", (code) => {
    if (code === 0) {
      jobs[jobId].status = "completed";
      done();
    } else {
      jobs[jobId].status = "failed";
      done(new Error(`Job ${jobId} failed with code ${code}`));
    }
  });
});

/* scrapeQueue.obliterate({ force: true });
scrapeQueue.getJobCounts().then((counts) => {
  console.log("string", counts);
}); */

export const startScraping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  try {
    let allHits: any[] = [];
    let page = 0;
    const pageSize = 100;

    while (true) {
      const {
        hits: { hits, total },
      } = await ESClient.search({
        index: "domains",
        body: {
          query: { match_all: {} },
          from: page * pageSize,
          size: pageSize,
        },
      });
      allHits = allHits.concat(hits);
      // @ts-expect-error
      if (allHits.length >= total?.value) break;
      page++;
    }

    const websites: string[] = allHits.map((hit: any) => hit._source.url);
    if (!websites.length)
      return res.status(400).json({ error: "URLs are required" });

    const timestamp = `${Date.now()}`;
    scrapeQueue.add({
      urls: websites.slice(0, 2).join(","),
      jobId: timestamp,
    });
    jobs[timestamp] = {
      status: "pending",
      result: [],
      progress: 0,
      successfulDomains: 0, // Initialize with 0
      erroredDomains: 0, // Initialize with 0
    };

    res.status(200).json({ jobId: timestamp });
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
) => {
  try {
    const { jobId } = req.params;
    const status = jobs[jobId] || null;
    console.log("jobs", status);
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
