const SEARXNG_URL = "https://search.bus-hit.me";

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const query = url.searchParams.get("q");

      if (!query || query.trim().length < 2) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Query pencarian kosong."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      const searchUrl =
        `${SEARXNG_URL}/search?q=` +
        encodeURIComponent(query) +
        `&format=json&language=id&categories=general`;

      const response = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "HI-UEO/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Mesin pencarian mengembalikan status ${response.status}`
        );
      }

      const data = await response.json();

      const results = Array.isArray(data.results)
        ? data.results.slice(0, 8).map(item => ({
            title: item.title || "",
            url: item.url || "",
            content: item.content || "",
            engine: item.engine || ""
          }))
        : [];

      return new Response(
        JSON.stringify({
          success: true,
          query: query,
          results: results
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
