import fs from "fs";
import csv from "csv-parser";
export const parseCSV = (filePath: string): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const results: object[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};
