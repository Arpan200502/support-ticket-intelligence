export function detectTrend(cluster) {

  const now = new Date();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const last14Days = new Date(now - 14 * 24 * 60 * 60 * 1000);

  let recent = 0;
  let previous = 0;

 for (const ticket of cluster.tickets || []) {

    const date = new Date(ticket.created_at);

    if (date > last7Days) {
      recent++;
    } 
    else if (date > last14Days) {
      previous++;
    }

  }

  const growthRate = (recent - previous) / Math.max(previous, 1);

  let trend = "stable";

  if (recent > previous) trend = "increasing";
  else if (recent < previous) trend = "decreasing";

  return {
    trend,
    growthRate,
    recent,
    previous
  };
}