export function detectTrend(cluster) {

  const now = new Date();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

  let recent = 0;
  let older = 0;

  for (const ticket of cluster.tickets) {

    const date = new Date(ticket.created_at);

    if (date > last7Days) recent++;
    else older++;
  }

  if (recent > older) return "increasing";
  if (recent < older) return "decreasing";
  return "stable";
}