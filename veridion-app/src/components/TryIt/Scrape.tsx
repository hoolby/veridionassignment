import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import axios from "axios";
import React, { useEffect, useState } from "react";

interface JobStatus {
  status: string;
  domainStatusCounts: {
    success: number;
    error: number;
  };
  totalDomains: number;
}

const Scrape: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(
    localStorage.getItem("jobId")
  );

  const setJobIdLocal = (id: string) => {
    localStorage.setItem("jobId", id);
    setJobId(id);
  };
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  /* SCRAPING */
  const [scrapeSuccess, setScrapeSuccess] = useState<boolean>(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");
  const [isScraping, setIsScraping] = useState<boolean>(false);

  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeStatus("");
    setJobStatus(null);

    try {
      const response = await fetch("http://localhost:3000/scrape/start", {
        method: "POST",
      });
      const data = await response.json();
      if (response.status === 200) {
        setScrapeSuccess(true);
        setJobIdLocal(data.jobId);
        setScrapeStatus(
          `Scraping job started successfully for ${data.totalDomains} domains`
        );
      } else {
        setScrapeSuccess(false);
        setScrapeStatus(
          `Failed to start scraping job with status: ${response.status}`
        );
      }
    } catch (error) {
      setScrapeSuccess(false);
      setScrapeStatus("Error during scraping job start");
    } finally {
      setIsScraping(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (jobId) {
        axios
          .get(`http://localhost:3000/scrape/status/${jobId}`)
          .then((response) => {
            setJobStatus(response.data);
          })
          .catch((err: unknown) => {
            console.log("Error ", err);
            clearInterval(interval);
          });
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status]);

  return (
    <div className="grid xs:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      {/* STEP 2 */}
      <Card key={"crawl"} className="md:col-span-2 lg:col-span-1 w-full">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {"Step 2:"}
          </CardTitle>
          <CardTitle>{"Start a scraping job"}</CardTitle>
          <CardTitle className="text-sm text-muted-foreground">
            {"Add all domains to scraping job and start it."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Card>
            <CardContent className="p-6 space-x-4 flex flex-row justify-center">
              <Button
                size="default"
                onClick={handleScrape}
                disabled={isScraping}
              >
                {isScraping ? "Starting..." : "Start Scraping Job"}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="flex flex-row justify-center">
          {scrapeStatus && (
            <p
              className={cn(
                "text-sm",
                scrapeSuccess ? "text-green-600" : "text-red-500"
              )}
            >
              {scrapeStatus}
            </p>
          )}
        </CardFooter>
      </Card>

      <div className="col-span-2 place-content-center">
        {jobStatus && (
          <div className="grid grid-cols-3 gap-8 place-content-center">
            <div className="text-center text-muted-foreground">
              <h2 className="text-3xl sm:text-4xl font-bold text-blue-500">
                {jobStatus?.domainStatusCounts?.success +
                  jobStatus?.domainStatusCounts?.error}{" "}
                / {jobStatus.totalDomains}
              </h2>{" "}
              domains
            </div>
            <div className="space-y-2 text-center text-green-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {jobStatus?.domainStatusCounts?.success}
              </h2>
              <p className="text-xl text-muted-foreground">{"Successful"}</p>
            </div>
            <div className="space-y-2 text-center text-red-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {jobStatus?.domainStatusCounts?.error}
              </h2>
              <p className="text-xl text-muted-foreground">{"Errored"}</p>
            </div>
            <div className="col-span-3 space-y-2 text-center text-orange-500">
              <h2 className="text-3xl sm:text-4xl font-bold ">
                {jobStatus.status}
              </h2>
              <p className="text-xl text-muted-foreground">{"Status"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scrape;
