import { kmeans } from "ml-kmeans";
import { getEmbedding } from "./embeddingService.js";

export async function clusterTickets(tickets) {

  const embeddings = [];
  const batchSize = 10;

  for (let i = 0; i < tickets.length; i += batchSize) {

    const batch = tickets.slice(i, i + batchSize);

    const batchEmbeddings = await Promise.all(
      batch.map(ticket => getEmbedding(ticket.text))
    );

    embeddings.push(...batchEmbeddings);
  }

  const k = Math.floor(Math.sqrt(tickets.length / 2));

  const result = kmeans(embeddings, k);

  return tickets.map((ticket, index) => ({
    ...ticket,
    cluster: result.clusters[index]
  }));
}