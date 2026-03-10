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

        const normalizedRow = Object.fromEntries(
            Object.entries(row).map(([k,v]) => [k.trim(), v])
              );

          tickets.push({
            id: normalizedRow["Ticket ID"],
            subject: normalizedRow["Ticket Subject"],
            description: normalizedRow["Ticket Description"],
            created_at: normalizedRow["Date of Purchase"],
            priority: normalizedRow["Ticket Priority"]
          });

      })
      .on("end", () => resolve(tickets))
      .on("error", reject);

  });
}