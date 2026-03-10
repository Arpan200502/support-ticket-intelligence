export function aggregateClusters(clusteredTickets) {

  const clusters = {};

  for (const ticket of clusteredTickets) {

    const clusterId = ticket.cluster;

    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        clusterId,
        count: 0,
        tickets: []
      };
    }

    clusters[clusterId].count += 1;
    clusters[clusterId].tickets.push(ticket);

    if (clusters[clusterId].tickets.length > 5) {
         clusters[clusterId].tickets.shift();
    }

  }

  return Object.values(clusters);

}