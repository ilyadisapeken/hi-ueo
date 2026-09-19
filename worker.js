const FREESEA_URL = "https://freesea.dev/v1/search";

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const query = url.searchParams.get("q");

      if (!query || query.trim().length < 2) {
        return jsonResponse(
          {
            success: false,
            error: "Query pencarian kosong."
          },
          400,
          corsHeaders
        );
      }

      if (!env.FREESEA_API_KEY) {
        return jsonResponse(
          {
            success: false,
            error: "FREESEA_API_KEY belum terpasang di Cloudflare Worker."
          },
          500,
          corsHeaders
        );
      }

      const response = await fetch(FREESEA_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.FREESEA_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          query: query.trim()
        })
      });

      const rawText = await response.text();

      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        return jsonResponse(
          {
            success: false,
            error: `FreeSea mengembalikan respons bukan JSON. Status: ${response.status}`,
            status: response.status
          },
          502,
          corsHeaders
        );
      }

      if (!response.ok) {
        return jsonResponse(
          {
            success: false,
            error: "FreeSea menolak permintaan pencarian.",
            status: response.status,
            details: data
          },
          response.status,
          corsHeaders
        );
      }

      const results = normalizeResults(data);

      return jsonResponse(
        {
          success: true,
          query: query.trim(),
          results: results,
          raw: data
        },
        200,
        corsHeaders
      );

    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: error.message || "Terjadi kesalahan pada Web Search."
        },
        500,
        corsHeaders
      );
    }
  }
};


function normalizeResults(data) {
  const possibleResults =
    data?.results ||
    data?.data?.results ||
    data?.items ||
    data?.data?.items ||
    [];

  if (!Array.isArray(possibleResults)) {
    return [];
  }

  return possibleResults.slice(0, 10).map(item => ({
    title:
      item.title ||
      item.name ||
      "",

    url:
      item.url ||
      item.link ||
      item.href ||
      "",

    content:
      item.content ||
      item.snippet ||
      item.description ||
      "",

    source:
      item.source ||
      item.domain ||
      ""
  }));
}


function jsonResponse(data, status, corsHeaders) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...corsHeaders
      }
    }
  );
}
