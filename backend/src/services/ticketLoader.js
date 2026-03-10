import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../../data/customer_support_tickets.csv");

export function loadTickets() {
  return new Promise((resolve, reject) => {

    const tickets = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {

        tickets.push({
          id: row["Ticket ID"],
          subject: row["Ticket Subject"],
          description: row["Ticket Description"],
          created_at: row["Ticket Created Time"],
          priority: row["Ticket Priority"]
        });

      })
      .on("end", () => resolve(tickets))
      .on("error", reject);

  });
}