function preprocessTickets(tickets) {
  return tickets.map((ticket) => {

    let text = `${ticket.subject || ""} ${ticket.description || ""}`;

    text = text
      // remove placeholders like {product}
      .replace(/\{.*?\}/g, "")
      .replace(/\[.*?\]/g, "")

      // remove HTML tags
      .replace(/<[^>]*>/g, "")
      // remove numbers that appear alone
      .replace(/\b\d+\b/g, "")

      // remove stray punctuation
      .replace(/[—–•]+/g, " ")
      // remove URLs
      .replace(/https?:\/\/\S+/g, "")

      // remove version numbers
      .replace(/\b\d+(\.\d+)+\b/g, "")

      // normalize whitespace
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // limit length AFTER cleaning
    text = text.slice(0, 500);

    return {
      id: ticket.id,
      text,
      created_at: ticket.created_at,
      priority: ticket.priority
    };

  });
}

export default preprocessTickets;