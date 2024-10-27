import express, { Router } from "express";
import ESClient from "@/utils/elasticSearchClient";

const router: Router = express.Router();

router.get("/get", async (req, res) => {
  try {
    const result = await ESClient.search({
      index: "domains",
      body: {
        query: {
          match_all: {}, // This queries all documents in the index
        },
      },
    });

    console.log("RESULT", JSON.stringify(result?.hits, null, 2));
    res.json(result?.hits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
