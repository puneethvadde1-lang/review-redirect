export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle /r/001, /r/002, etc.
    if (!url.pathname.startsWith("/r/")) {
      return new Response("QR Redirect System is working.", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    const slug = url.pathname.split("/r/")[1];

    if (!slug) {
      return new Response("Card not found.", { status: 404 });
    }

    // Find the card in Supabase
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cards?slug=eq.${encodeURIComponent(slug)}&select=review_url,scans,active`,
      {
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      return new Response("Database error.", { status: 500 });
    }

    const cards = await response.json();
    const card = cards[0];

    if (!card || !card.active || !card.review_url) {
      return new Response("This card is not active.", { status: 404 });
    }

    // Increase scan count
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/cards?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          scans: (card.scans || 0) + 1
        })
      }
    );

    // Send customer to Google review page
    return Response.redirect(card.review_url, 302);
  }
};
