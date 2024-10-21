import { parseCSV } from "@/utils/csvReader";
import express, { NextFunction, Request, Response, Router } from "express";
import multer from "multer";

// Configure Multer for file uploads
const upload = multer({ dest: "data/" });

function getDomainFromUrl(url: string) {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
    }
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error(`Invalid URL: ${url}`);
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
      const fs = require("fs");
      const dataDir = "output";
      const filePath = req.file.path;
      const timestamp = `${Date.now()}`;

      let websites = await parseCSV(filePath);
      const domains = websites.map(getDomainFromUrl);

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }

      fs.writeFileSync(
        `${dataDir}/${timestamp}.data.json`,
        JSON.stringify(domains, null, 2)
      );

      res.status(200).json({
        message: `Successfully uploaded ${domains.length} domains.`,
        dataId: timestamp,
      });

      // Delete the uploaded file after processing
      fs.unlink(filePath, (err: any) => {
        if (err) {
          console.error(`Error deleting file: ${err}`);
        } else {
          console.info(`File ${filePath} deleted successfully.`);
        }
      });

      console.info(`Uploaded ${domains.length} domains.`);
      console.info(`Uploaded ${domains.length} domains.`);
    } catch (error) {
      console.error(`Error uploading domains: ${error}`);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

export default router;
