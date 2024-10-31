import ESClient, {
  createOrUpdateJob,
  getJobById,
} from "@/utils/elasticSearchClient";
import Bull from "bull";
import { spawn } from "child_process";
import { NextFunction, Request, Response } from "express";

const scrapeQueue = new Bull(
  "scraping",
  `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
);

const CONCURRENCY = 3;

let activeScrapyProcesses = 0;

scrapeQueue.process(CONCURRENCY, async (job, done) => {
  activeScrapyProcesses++;
  console.log(
    `Starting Scrapy process. Active processes: ${activeScrapyProcesses}`
  );

  const { domains, jobId, totalDomains } = job.data;
  const scraper = spawn(
    "scrapy",
    [
      "runspider",
      "scripts/scrape.py",
      "-a",
      `domains=${domains}`,
      "-a",
      `job_id=${jobId}`,
    ],
    { stdio: ["inherit", "pipe", "pipe"] }
  );

  // Log handling function
  const handleDomainSpiderLog = async (data: string, err = false) => {
    if (data.startsWith("[domain_spider]: ")) {
      const logData = data.split("[domain_spider]: ")[1];
      try {
        const jsonData = JSON.parse(logData);
        console.log(`JSON LOG: `, JSON.parse(jsonData));
      } catch {
        console.log(`CUSTOM LOG: `, logData);
      }
      return;
      if (data.includes("PROGRESS: ")) {
        const resultData = JSON.parse(data.split("PROGRESS: ")[1]);
        const jobData = await getJobById(jobId);

        // Update job progress
        jobData.successfulDomains++;
        jobData.progress = Math.round(
          ((jobData.successfulDomains + jobData.erroredDomains) /
            totalDomains) *
            100
        );

        await createOrUpdateJob(jobId, jobData);

        // Update each domain in Elasticsearch
        try {
          await ESClient.update({
            index: "domains",
            id: resultData.url,
            body: { doc: resultData, doc_as_upsert: true },
          });
        } catch (error: any) {
          console.error(
            `Failed to update Elasticsearch for ${resultData.url}: ${error.message}`
          );
        }
      } else if (data.includes("SCRAPE SUCCESS:")) {
        const jobData = await getJobById(jobId);
        jobData.status = "completed";
        await createOrUpdateJob(jobId, jobData);
        done();
      } else if (data.includes("Error for")) {
        const jobData = await getJobById(jobId);
        jobData.erroredDomains++;
        jobData.progress = Math.round(
          ((jobData.successfulDomains + jobData.erroredDomains) /
            totalDomains) *
            100
        );
        await createOrUpdateJob(jobId, jobData);
      }
    } else if (data.startsWith("[scrapy.")) {
      // console.log(`SCRAPY LOG: ${data}`);
    } else {
      // console.log(`UNACCOUNTED${err ? " ERROR " : " "}LOG: ${data}`);
    }
  };

  // Handle Scrapy output logs
  scraper.stdout.setEncoding("utf8");
  scraper.stdout.on("data", async (data) => {
    handleDomainSpiderLog(data);
  });

  scraper.stderr.setEncoding("utf8");
  scraper.stderr.on("data", async (data) => {
    handleDomainSpiderLog(data, true);
  });

  // Finalize job on process close
  scraper.on("close", async (code) => {
    activeScrapyProcesses--;
    console.log(
      `Scrapy process completed. Active processes: ${activeScrapyProcesses}`
    );

    const jobData = await getJobById(jobId);
    jobData.status = code === 0 ? "completed" : "failed";
    await createOrUpdateJob(jobId, jobData);

    if (code !== 0) {
      done(new Error(`Job ${jobId} failed with code ${code}`));
    } else {
      done();
    }
  });
});

// Endpoint to start scraping
export const startScraping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  try {
    const timestamp = `${Date.now()}`;
    const jobData = {
      status: "pending",
      result: [],
      progress: 0,
      successfulDomains: 0,
      erroredDomains: 0,
      queuedDomains: 0,
    };
    await createOrUpdateJob(timestamp, jobData);

    const scrollTimeout = "1m";
    const { _scroll_id, hits } = await ESClient.search({
      index: "domains",
      scroll: scrollTimeout,
      body: { query: { match_all: {} }, size: 100 },
    });
    //@ts-expect-error
    if (!hits.total?.value) {
      return res.status(400).json({ error: "No URLs found in the index." });
    }

    let scrollId = _scroll_id;
    let totalProcessed = 0;
    //@ts-expect-error
    const totalDomains = hits.total.value;

    while (hits.hits.length) {
      const batchDomains = hits.hits.map((hit: any) => hit._source.domain);
      if (batchDomains.length) {
        scrapeQueue.add({
          domains: batchDomains.join(","),
          jobId: timestamp,
          totalDomains,
        });
      }

      totalProcessed += batchDomains.length;

      // Update queued domains and job progress
      await createOrUpdateJob(timestamp, {
        queuedDomains: totalProcessed,
        totalDomains,
        progress: Math.round((totalProcessed / totalDomains) * 100),
      });

      const nextScroll = await ESClient.scroll({
        scroll_id: scrollId,
        scroll: scrollTimeout,
      });

      scrollId = nextScroll._scroll_id;
      hits.hits = nextScroll.hits.hits;
    }

    res.status(200).json({ jobId: timestamp });
  } catch (error) {
    console.error(`Error starting scraping: ${error}`);
    res.status(500).json({ message: "Internal server error." });
    next(error);
  }
};

// Endpoint to get scraping job status
export const getScrapingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;
    const status = await getJobById(jobId);
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
