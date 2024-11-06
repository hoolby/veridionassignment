import Analyze from "./Analyze";
import Query from "./Query";
import Scrape from "./Scrape";
import Upload from "./Upload";

export const TryIt = () => {
  return (
    <section id="tryit" className="container py-24 sm:py-32 space-y-8">
      <h2 className="text-3xl lg:text-4xl font-bold md:text-center">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Try{" "}
        </span>
        it
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
