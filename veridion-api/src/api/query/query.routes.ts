import express, { Router, Request, Response, NextFunction } from "express";
import ESClient from "@/utils/elasticSearchClient";
import { analyzeDomains } from "../scrape/scrape.controller";

const router: Router = express.Router();

router.post(
  "/query",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | any> => {
    try {
      const input_name = req.body["input name"]
        ?.trim()
        .replace(/[^a-zA-Z0-9. ]/g, "");
      const input_phone = req.body["input phone"];
      const input_website = req.body["input website"];
      const input_facebook = req.body["input_facebook"];
      const facebookUsernameMatch = input_facebook?.match(
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/
      );
      const facebookUsername = facebookUsernameMatch
        ? facebookUsernameMatch[1]
        : null;

      // Input validation and cleanup
      const cleanPhone = input_phone?.replace(/[^0-9+]/g, ""); // Keep only numbers and "+"
      const domainMatch = input_website?.match(
        /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
      )?.[0];
      const strippedDomainMatch = domainMatch?.replace(/\//g, "");

      // Construct Elasticsearch query
      const query: any = {
        index: "domains",
        body: {
          query: {
            bool: {
              should: [
                ...(input_name
                  ? [{ match_phrase: { company_commercial_name: input_name } }]
                  : []),
                ...(cleanPhone
                  ? [{ wildcard: { phone_numbers: `*${cleanPhone}*` } }]
                  : []),
                ...(strippedDomainMatch
                  ? [{ wildcard: { domain: `*${strippedDomainMatch}*` } }]
                  : []),
                ...(facebookUsername
                  ? [{ wildcard: { facebook: `*${facebookUsername}*` } }]
                  : []),
              ],
              minimum_should_match: 1,
            },
          },
          _source: {
            excludes: ["text_content"],
          },
        },
      };

      // Search in Elasticsearch
      const { hits } = await ESClient.search(query);

      // Sort matches by score
      const sortedHits = hits.hits.sort(
        (a: any, b: any) => b._score - a._score
      );
      const finalRes = {
        bestMatch: sortedHits[0]?._source
          ? { ...sortedHits[0]._source, score: sortedHits[0]._score }
          : null,
        matches: sortedHits.map((hit: any) => ({
          ...hit._source,
          score: hit._score,
        })),
        usedParams: {
          name: input_name,
          phone: cleanPhone,
          website: strippedDomainMatch,
          facebook: facebookUsername,
        },
      };
      console.log("finalRes", finalRes);
      // Return matches
      res.status(200).json(finalRes);
    } catch (error) {
      // @ts-expect-error
      res.status(500).json({ error: error?.message });
    }
  }
);

router.get("/analyze", analyzeDomains);

export default router;
