function preprocessTickets(tickets) {
  return tickets.map((ticket) => {

    let text = `${ticket.subject || ""} ${ticket.description || ""}`;

    text = text

      // replace placeholders instead of removing them
      .replace(/\{.*?\}/g, " product ")
      .replace(/\[.*?\]/g, " item ")

      // remove HTML
      .replace(/<[^>]*>/g, "")

      // remove URLs
      .replace(/https?:\/\/\S+/g, "")

      // remove strange punctuation
      .replace(/[—–•]+/g, " ")

      // normalize whitespace
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    text = text.slice(0, 500);
    text = text.toLowerCase()
    return {
      id: ticket.id,
      text,
      created_at: ticket.created_at,
      priority: ticket.priority
    };

  });
}
export default preprocessTickets;
