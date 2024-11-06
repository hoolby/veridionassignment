import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface SponsorProps {
  name: string;
  description: string;
  image: string;
}

const sponsors: SponsorProps[] = [
  {
    name: "Node.js",
    description: "It's easy",
    image: "/node.svg",
  },
  {
    name: "TypeScript",
    description: "Because NormalScript isn't sexy",
    image: "/typescript.png",
  },
  {
    name: "Express.js",
    description: "API",
    image: "/express.png",
  },
  {
    name: "Python",
    description: "Data Scientists love python",
    image: "/python.png",
  },
  {
    name: "Scrapy",
    description: "Your friendly neighbourhood web scraper",
    image: "/scrapy.png",
  },
  {
    name: "spaCy",
    description:
      "Natural Language Processing, NER to be exact ( i learned new words )",
    image: "/scrapy.png",
  },
  {
    name: "Redis",
    description: "Queue to manage scraping jobs",
    image: "/redis.png",
  },
  {
    name: "ElasticSearch",
    description: "The base of the data",
    image: "/es.png",
  },
  {
    name: "React",
    description: "You are looking at it",
    image: "/react.png",
  },
  {
    name: "Docker",
    description: "Initially to deploy ES and Redis but now i packed everything",
    image: "/docker.png",
  },
  {
    name: "Some other stuff",
    description: "Not that important",
    image: "",
  },
];

export const TechStack = () => {
  return (
    <section id="techstack" className="container pt-24 sm:py-32">
      <h2 className="text-3xl lg:text-4xl font-bold md:text-center mb-8">
        Tech{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          Stack
        </span>
        <p className="text-muted-foreground text-xl mt-4 mb-8 font-normal">
          tbh is my first time using some of these
        </p>
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
        {sponsors.map(({ name, description, image }: SponsorProps) => (
          <Card className="h-fit drop-shadow-xl shadow-black/10 dark:shadow-white/10">
            <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
              <Avatar className="rounded-none bg-transparent">
                <AvatarImage
                  alt=""
                  src={image}
                  className="bg-transparent max-h-14"
                />
              </Avatar>
              <div>
                <CardTitle>{name}</CardTitle>
                <CardDescription className="text-md mt-2">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};
