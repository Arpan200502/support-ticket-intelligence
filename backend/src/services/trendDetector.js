export function detectTrend(issue) {

  const now = new Date();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const prev14Days = new Date(now - 14 * 24 * 60 * 60 * 1000);

  let recent = 0;
  let previous = 0;

  for (const ticket of issue.tickets) {

    const date = new Date(ticket.created_at);

    if (date > last7Days) {
      recent++;
    }
    else if (date > prev14Days) {
      previous++;
    }

  }

  

  if (recent > previous) return "increasing";
  if (recent < previous) return "decreasing";

  return "stable";
}