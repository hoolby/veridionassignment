import { parseCSV } from "@/utils/csvReader";
import { updateOrIndexDocument } from "@/utils/elasticSearchClient";
import express, { Request, Response, Router } from "express";
import multer from "multer";

// Configure Multer for file uploads
const upload = multer({ dest: "data/" });

function formatDomain(url: string): string | null {
  try {
    // Ensure proper domain format without "www", "http/https"
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
    }
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace(/^www\./, ""); // Remove "www"
    return domain;
  } catch (error: any) {
    console.error(`Invalid URL format for ${url}: ${error?.message}`);
    return null;
  }
}

const router: Router = express.Router();

router.post(
  "/csv",
  upload.single("file"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }
      const filePath = req.file.path;

      // Parse CSV file and get domains
      const websites = await parseCSV(filePath);
      const formattedDomains: string[] = websites
        .map(formatDomain)
        .filter((domain): domain is string => domain !== null); // Filter out nulls

      if (formattedDomains.length === 0) {
        return res
          .status(400)
          .json({ message: "No valid domains found in CSV." });
      }

      const currentDate = new Date().toISOString(); // ISO 8601 formatted date

      // For each domain, check if it exists, if so update it, otherwise create a new entry
      let totalIndexed = 0;
      let totalUpdated = 0;
      let totalErrored = 0;

      await Promise.all(
        formattedDomains.map(async (domain: string) => {
          const document = {
            url: domain,
            added_date: currentDate,
          };
          const result = await updateOrIndexDocument(
            "domains",
            domain,
            document
          );
          switch (result) {
            case null:
              totalErrored++;
              break;
            case 0:
              totalIndexed++;
              break;
            case 1:
              totalUpdated++;
              break;
          }
        })
      );

      // Respond with success message
      return res.status(200).json({
        status: 200,
        indexed: totalIndexed,
        updated: totalUpdated,
        errored: totalErrored,
      });
    } catch (error: any) {
      console.error(`Error processing CSV upload: ${error?.message}`);
      return res.status(500).json({ message: "Internal server error." });
    }
  }
);

export default router;
