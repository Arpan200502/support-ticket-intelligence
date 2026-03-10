export function aggregateClusters(clusteredTickets) {

  const clusters = {};

  for (const ticket of clusteredTickets) {

    const clusterId = ticket.cluster;

    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        clusterId,
        count: 0,
        tickets: [],     
        examples: []     
      };
    }

    clusters[clusterId].count += 1;

    clusters[clusterId].tickets.push(ticket);

    
    if (clusters[clusterId].examples.length < 5) {
      clusters[clusterId].examples.push(ticket.text);
    }

  }

  return Object.values(clusters);
}