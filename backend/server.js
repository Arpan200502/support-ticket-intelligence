import express from "express";
import cors from "cors";

import { loadTickets } from "./src/services/ticketLoader.js";
import preprocessTickets from "./src/services/preprocessTickets.js";
import { getEmbedding } from "./src/services/embeddingService.js";
import { clusterTickets } from "./src/services/clusteringService.js";
import { aggregateClusters } from "./src/services/clusterAggregator.js";
import { labelClusters } from "./src/services/clusterLabeler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    
  res.send("Support Ticket Intelligence API");
});
app.get("/insights", async (req, res) => {

  try {

    console.log("1. Loading tickets");
    const tickets = await loadTickets();

    console.log("2. Preprocessing");
    const processed = preprocessTickets(tickets);

    console.log("3. Limiting dataset");
    const subset = processed.slice(0, 200);

    console.log("4. Clustering");
    const clustered = await clusterTickets(subset);

    console.log("5. Aggregating");
    const aggregated = aggregateClusters(clustered);
    console.log("6. Sortingg");
    aggregated.sort((a, b) => b.count - a.count);
    console.log("7. Labeling clusters");
    const labeled = labelClusters(aggregated);
    

    console.log("8. Sending response");

    res.json(labeled);

  } catch (error) {

    console.error("Pipeline error:", error);
    res.status(500).json({ error: "Cluster processing failed" });

  }

});

app.get("/tickets", async (req, res) => {
  const tickets = await loadTickets("./data/customer_support_tickets.csv");
  const processed = preprocessTickets(tickets);

  res.json(processed.slice(0, 20));
});

app.get("/test-embedding", async (req, res) => {
  const vector = await getEmbedding(
    "Unable to connect to the server"
  );

  res.json({ length: vector.length });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});