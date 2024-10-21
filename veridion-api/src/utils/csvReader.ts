import fs from "fs";
import csv from "csv-parser";

export const parseCSV = (filePath: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const results: string[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        if (data.domain) {
          results.push(data.domain);
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};
