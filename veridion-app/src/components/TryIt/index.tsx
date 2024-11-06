import { Link, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardTitle } from "../ui/card";
import Analyze from "./Analyze";
import Query from "./Query";
import Scrape from "./Scrape";
import Upload from "./Upload";
import { Button } from "../ui/button";

export const TryIt = () => {
  return (
    <section id="tryit" className="container py-24 sm:py-32 space-y-8">
      <h2 className="text-3xl lg:text-4xl font-bold md:text-center space-y-4">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Try{" "}
        </span>
        it
        <Card className="text-muted-foreground text-lg font-normal p-2 flex flex-col">
          <CardTitle className="flex flex-row justify-center items-center gap-4 text-red-400">
            <TriangleAlert size={24} className="text-xl" /> Important
          </CardTitle>
          <CardContent className="text-center flex flex-col justify-center items-center space-y-6 pt-2">
            These features only work when running locally because I'm too lazy
            to deploy the backend.
            <span className="">But you can see it working here:</span>
            <Button
              onClick={() =>
                window.open(
                  "https://drive.google.com/file/d/1d3R2K5u3kBI4DrfH4_w0hz2C4N566Yam/preview",
                  "_blank"
                )
              }
              className="underline mt-4 font-bold gap-2"
            >
              <Link size={20} />
              Google Drive
            </Button>
            <span className="">OR</span>
            <iframe
              src="https://drive.google.com/file/d/1d3R2K5u3kBI4DrfH4_w0hz2C4N566Yam/preview"
              width="100%"
              height="720"
              allow="autoplay"
              className="mt-4"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            ></iframe>
          </CardContent>
        </Card>
      </h2>

      <div className="grid gap-8">
        {/* STEP 1 */}
        <Upload />
        {/* STEP 2 */}
        <Scrape />
        {/* STEP 3 */}
        <Analyze />
        {/* STEP 4 */}
        <Query />
      </div>
    </section>
  );
};
