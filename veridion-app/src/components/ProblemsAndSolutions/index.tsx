import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  question: string;
  answer: string | string[];
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "Reasoning behind building this",
    answer: [
      "From the start I knew i wanted to do more than just scrape the data once and query it from an API.\n Because if I can make it run once, why not make it re-usable and scalable, and a bit easier to use then via postman.",
      "Additionally this was a discovery process, to understand the problems and obstacles that come with scraping data, and how to solve them.",
      "Finally, since i'm applying for a Software Developer job, I consider it important to show how I can build solutions to solve problems. As much as I would love to go more in depth with Crawling, NLP and Machine Learning in general, currently this is not a strongpoint of mine.",
    ],
    value: "item-1",
  },
  {
    question: "Architecture",
    answer: [
      "1. Started with some Express Typescript template because configuring typescript will be the death of me. Was thinking to try Deno2 as it came out recently, but I decided to spend more time on what I have the least experience with, the Crawler.",
      "2. Initially I tryied scraping with Node.js using Puppeteer as I had some experience with it, but i also had a lot of problems with it so i decided to change it.",
      "3. Added a Python Scrapy Crawler and started testing it and solving all the issues that popped up ( more in the Crawler section ).",
      "4. Added a React Template to start connecting some of the logic, and figuring out what would be the needs of such an app.",
      "5. Added Redis in memory database to manage crawling jobs, inside a container to make deployment easier.",
      "6. Added ElasticSearch db for storing data, specifically for better search performance, again, inside a container.",
    ],
    value: "item-2",
  },
  {
    question: "Crawler",
    answer: [
      "The crawler went through A LOT of changes, from starting with a Typescript Crawler, to switching to Python Scrapy for better performance. Aside from that, once I started developing the Crawler, I started encountering a lot of problems, some of which required the following functionalities:",
      "1. URL format parser to handle URLs with or without www and http/s. The parser goes through all variants until it finds a working one or it returns an error.",
      "2. Handled redirects, as it was causing errors in the crawler.",
      "3. Security concerns, checking for known vulnerabilities with Python when accessing unsafe websites.",
      "4. Saving results locally for quick analysis, and then proceeding to store them in ES.",
      "5. Handling text extraction, using BeautifulSoup for text extraction to avoid scanning irrelevant content like scrips and styles.",
      "6. Handling links to sub pages, updating the scraper to follow links but not media links and making sure they are on the same domain. ( Later on I decided not to crawl sub pages, but good to know what kinda of issues i would have to solve )",
      "7. Played around with storing data as files for NLP processing, inspired by a tech map from Soleadify.",
      "8. Added Spacy for NLP processing of Organization Names and Address (Named Entity Recognition) and tryied improving the relevance of extracted names by updating Spacy to only extract names similar to the domain name.",
      "9. Tryied using Spacy for phone numbers as well by configuring a custom matcher, but it was not very successful. So I used regex to extract phone numbers and normalize them.",
      "10. Added a simple function to extract social media links",
      "11. Reporting back results to the API, and storing them in ES.",
      "12. Probably a lot of other small things I forgot about",
    ],
    value: "item-3",
  },
  {
    question: "API",
    answer: [
      "1. Created endpoints to upload files, start, get status, and get results of the scraping process.",
      "2. Had a blast trying to figure out how to handle the concurrent crawlers, dividing the jobs between them, and making sure they don't interfere with each other.",
      "3. Allowing new data to be uploaded and merged into existing entries ( considering new one as valid and overwriting the existing one )",
      "4. Added endpoints to query the ES database for fill rates",
      "5. Added an endpoint to handle querying the data, using multiple parameters and getting the best match.",
    ],
    value: "item-4",
  },
  {
    question: "Front End",
    answer: [
      "I mean this was pretty easy peasy but a lot of the functionality actually came from acting like a user of such an app and trying to figure out what would make 'my job' easier or nicer, in terms of feedback and functionality.",
    ],
    value: "item-5",
  },
];

export const ProblemsAndSolutions = () => {
  return (
    <section id="faq" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
        Problems{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          and Solutions
        </span>
        <p className="text-muted-foreground text-xl mt-4 mb-8 font-normal">
          Let there be problems, because solutions we have
        </p>
      </h2>

      <Accordion type="single" collapsible className="w-full AccordionRoot">
        {FAQList.map(({ question, answer, value }: FAQProps) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left">
              {question}
            </AccordionTrigger>
            <AccordionContent>
              {Array.isArray(answer)
                ? answer.map((paragraph, index) => (
                    <p key={index} className="p-1">
                      {paragraph}
                    </p>
                  ))
                : answer.split("\n").map((paragraph, index) => (
                    <p key={index} className="p-1">
                      {paragraph}
                    </p>
                  ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
