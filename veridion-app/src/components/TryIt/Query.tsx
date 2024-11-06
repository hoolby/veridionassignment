import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import queries from "./queries";

const Query: React.FC = () => {
  const [selectedQuery, setSelectedQuery] = useState<Record<
    string,
    string
  > | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [querySuccess, setQuerySuccess] = useState<boolean>(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");

  interface QueryResult {
    usedParams?: {
      name?: string;
      phone?: string;
      website?: string;
      facebook?: string;
    };
    matches?: unknown[];
    bestMatch?: {
      score?: number;
      [key: string]: unknown;
    };
  }

  const [result, setResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    /* console.log("selectedQuery", selectedQuery); */
  }, [selectedQuery]);

  const handleQuery = async () => {
    setIsQuerying(true);
    setScrapeStatus("");

    try {
      const response = await fetch(`http://localhost:3000/query/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedQuery),
      });
      const data = await response.json();
      console.log("daa", data);
      if (response.status === 200) {
        setQuerySuccess(true);
        setResult(data);
        setScrapeStatus("Scraping job started successfully");
      } else {
        setQuerySuccess(false);
        setScrapeStatus(
          `Failed to start scraping job with status: ${response.status}`
        );
      }
    } catch (error) {
      setQuerySuccess(false);
      setScrapeStatus("Error during scraping job start");
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* STEP 2 */}
      <Card key={"crawl"} className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {"Step 4:"}
          </CardTitle>
          <CardTitle>{"Query"}</CardTitle>
          <CardTitle className="text-sm text-muted-foreground">
            {"The data."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={(val) => setSelectedQuery(queries[parseInt(val)])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a query" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {queries.map((query, index) => (
                  <SelectItem value={`${index}`}>
                    {query?.["input name"]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <CardContent className="p-6 space-x-4 flex flex-row justify-center">
            <Button size="default" onClick={handleQuery} disabled={isQuerying}>
              {isQuerying ? "Querying..." : "Query"}
            </Button>
          </CardContent>
        </CardContent>
        <CardFooter className="flex flex-row justify-center">
          {scrapeStatus && (
            <p
              className={cn(
                "text-sm",
                querySuccess ? "text-green-600" : "text-red-500"
              )}
            >
              {scrapeStatus}
            </p>
          )}
        </CardFooter>
      </Card>
      <Card className="col-span-1 p-4 space-y-4">
        <CardTitle className="p-4 flex flex-col">{"Query params"}</CardTitle>
        <div className="flex flex-col space-y-4">
          <span>Input Name: {selectedQuery?.["input name"]}</span>
          <span>Input phone: {selectedQuery?.["input phone"]}</span>
          <span>Input website: {selectedQuery?.["input website"]}</span>
          <span>Input facebook: {selectedQuery?.["input_facebook"]}</span>
        </div>
      </Card>
      <Card className="col-span-1 p-4 space-y-4">
        <CardTitle className="p-4 flex flex-col">{"Query result"}</CardTitle>
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-blue-400">
            Cleaned search params:
          </span>
          <span>
            Name:{" "}
            <span className="text-blue-500">{result?.usedParams?.name}</span>
          </span>
          <span>
            Phone:{" "}
            <span className="text-blue-500">{result?.usedParams?.phone}</span>
          </span>
          <span>
            Website:{" "}
            <span className="text-blue-500">{result?.usedParams?.website}</span>
          </span>
          <span>
            Facebook:{" "}
            <span className="text-blue-500">
              {result?.usedParams?.facebook}
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-blue-400">Results:</span>
          <span>
            No. of Matches:{" "}
            <span className="text-blue-500">{result?.matches?.length}</span>
          </span>
          <span>
            Best Match Score:{" "}
            <span className="text-blue-500">{result?.bestMatch?.score}</span>
          </span>
          <span>Best Match: </span>
          <span>
            <pre className="text-blue-500 whitespace-pre-wrap">
              {JSON.stringify(result?.bestMatch, null, 2)}
            </pre>
          </span>
        </div>
      </Card>
    </div>
  );
};

export default Query;
