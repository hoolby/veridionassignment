import { parseCSV } from "@/utils/csvReader";
import { updateOrIndexDocument } from "@/utils/elasticSearchClient";
import express, { Request, Response, Router } from "express";
import multer from "multer";
import fs from "fs";

// Configure Multer for file uploads
const upload = multer({ dest: "data/" });

function formatDomain(domain: string): string | null {
  try {
    // Ensure proper domain format without "www", "http/https"
    if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
      domain = "http://" + domain;
    }
    const parsedUrl = new URL(domain);
    const formattedDomain = parsedUrl.hostname.replace(/^www\./, ""); // Remove "www"
    return formattedDomain;
  } catch (error: any) {
    console.error(`Invalid URL format for ${domain}: ${error?.message}`);
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
        fs.unlinkSync(filePath); // Delete the file
        return res
          .status(400)
          .json({ message: "No valid domains found in CSV." });
      }

      const added_date = new Date().toISOString(); // ISO 8601 formatted date

      // For each domain, check if it exists, if so update it, otherwise create a new entry
      let totalIndexed = 0;
      let totalUpdated = 0;
      let totalErrored = 0;

      await Promise.all(
        formattedDomains.map(async (domain: string) => {
          const document = {
            domain,
            added_date,
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

      fs.unlinkSync(filePath); // Delete the file

      // Respond with success message
      return res.status(200).json({
        status: 200,
        indexed: totalIndexed,
        updated: totalUpdated,
        errored: totalErrored,
      });
    } catch (error: any) {
      console.error(`Error processing CSV upload: ${error?.message}`);
      if (req.file) {
        fs.unlinkSync(req.file.path); // Delete the file
      }
      return res.status(500).json({ message: "Internal server error." });
    }
  }
);

export default router;
