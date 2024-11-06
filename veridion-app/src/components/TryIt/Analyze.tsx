import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface JobStatus {
  status: string;
  domainStatusCounts: {
    success: number;
    error: number;
  };
  fillRates: {
    field: string;
    fillRate: number;
  }[];
  totalDomains: number;
}

const Analyze: React.FC = () => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  /* SCRAPING */
  const [analyzeSuccess, setAnalyzeSuccess] = useState<boolean>(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeStatus("");
    setJobStatus(null);

    try {
      const response = await fetch(`http://localhost:3000/query/analyze`, {
        method: "GET",
      });
      const data = await response.json();
      if (response.status === 200) {
        setJobStatus(data);
        setAnalyzeSuccess(true);
        setAnalyzeStatus(
          `Analyzed ${
            data.domainStatusCounts?.success + data?.domainStatusCounts?.error
          } domains`
        );
      } else {
        setAnalyzeSuccess(false);
        setAnalyzeStatus(`Failed to analyze with status: ${response.status}`);
      }
    } catch (error) {
      setAnalyzeSuccess(false);
      setAnalyzeStatus("Error during analysis job start");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* STEP 2 */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {"Step 3:"}
          </CardTitle>
          <CardTitle>{"Analyze entire database"}</CardTitle>
          <CardTitle className="text-sm text-muted-foreground">
            {"Coverage, fill rate, and more."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Card>
            <CardContent className="p-6 space-x-4 flex flex-row justify-center">
              <Button
                size="default"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="flex flex-row justify-center">
          {analyzeStatus && (
            <p
              className={cn(
                "text-sm",
                analyzeSuccess ? "text-green-600" : "text-red-500"
              )}
            >
              {analyzeStatus}
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
                  jobStatus?.domainStatusCounts?.error}
              </h2>{" "}
              Total
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
            <div className="col-span-3 space-y-2 text-center text-blue-500 divide-y-2">
              <p className="text-xl text-foreground ">{"Fill rates"}</p>
              <div className="grid grid-cols-4 gap-10">
                {jobStatus.fillRates?.map((rate) => (
                  <div
                    key={rate.field}
                    className="text-lg font-bold text-muted-foreground"
                  >
                    {rate.field.charAt(0).toUpperCase() + rate.field.slice(1)}:{" "}
                    <h2 className="text-blue-500 text-xl">
                      {rate.fillRate.toFixed(2)} %
                    </h2>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyze;
