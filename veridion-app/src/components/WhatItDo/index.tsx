import { ChartArea, Globe, Search, ThumbsUp, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FeatureProps {
  icon: JSX.Element;
  title: string;
  description: string;
  description2?: string;
}

const features: FeatureProps[] = [
  {
    icon: <Upload color="#d59637" size={40} />,
    title: "Upload",
    description:
      "Upload a csv of domains (with or without data) to index or merge into existing entries",
  },
  {
    icon: <Globe color="#d59637" size={40} />,
    title: "Scrape",
    description:
      "Crawl website pages and extract specific data points for each domain",
  },
  {
    icon: <ChartArea color="#d59637" size={40} />,
    title: "Analyze",
    description: "Fill rates and stuff.",
  },
  {
    icon: <Search color="#d59637" size={40} />,
    title: "Query",
    description:
      "Based on multiple parameters at once, getting the best matching result.",
  },
  {
    icon: <ThumbsUp color="primary" size={40} />,
    title: "Get me a job",
    description: "please",
  },
];

export const WhatItDo = () => {
  return (
    <section id="WhatItDo" className="container text-center py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          What{" "}
        </span>{" "}
        can this app{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          do ?
        </span>
      </h2>

      <p className="md:w-3/4 mx-auto mt-4 mb-8 text-xl text-muted-foreground">
        Everything in the assignment, but more complex just for the heck of it,
        and with a front-end
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(
          ({ icon, title, description, description2 }: FeatureProps) => (
            <Card key={title} className="bg-muted/50">
              <CardHeader>
                <CardTitle className="grid gap-4 place-items-center">
                  {icon}
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {description}
                <br></br>
                {description2}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </section>
  );
};
