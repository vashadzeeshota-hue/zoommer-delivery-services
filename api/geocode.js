import { errorResponse, getRequestId, json } from "../server/http.js";

const DEFAULT_PHOTON_BASE_URL = "https://photon.komoot.io";
const GEORGIA_BBOX = "40.006,41.05,46.75,43.59";

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function normalizeFeature(feature) {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties || {};
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const city = firstText(
    properties.city,
    properties.town,
    properties.village,
    properties.county,
  );
  const street = [properties.street, properties.housenumber].filter(Boolean).join(" ");
  const address = firstText(
    street,
    properties.name,
    properties.district,
    properties.locality,
  );
  const labelParts = [properties.name, street, city, properties.postcode, properties.country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    label: labelParts.join(", ") || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    address: address || labelParts[0] || "",
    city,
    postalCode: firstText(properties.postcode),
    lat,
    lng,
  };
}

async function photonRequest(path, request) {
  const baseUrl = (process.env.PHOTON_BASE_URL || DEFAULT_PHOTON_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/geo+json, application/json",
      "Accept-Language": "ka,en;q=0.8",
      "User-Agent": "ZoommerDelivery/0.1 (+https://zoommer-delivery-services.vercel.app)",
      Referer: new URL(request.url).origin,
    },
  });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  return response.json();
}

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    }

    try {
      const url = new URL(request.url);
      const mode = url.searchParams.get("mode") || "search";
      let data;

      if (mode === "reverse") {
        const lat = Number(url.searchParams.get("lat"));
        const lng = Number(url.searchParams.get("lng"));
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return errorResponse("INVALID_COORDINATES", "Valid latitude and longitude are required", 400, requestId);
        }
        data = await photonRequest(`/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&limit=1`, request);
      } else {
        const query = String(url.searchParams.get("q") || "").trim();
        if (query.length < 3 || query.length > 180) {
          return errorResponse("INVALID_QUERY", "Search query must contain 3–180 characters", 400, requestId);
        }
        data = await photonRequest(`/api?q=${encodeURIComponent(query)}&limit=5&bbox=${GEORGIA_BBOX}`, request);
      }

      const results = (data.features || []).map(normalizeFeature).filter(Boolean);
      return json(
        { results },
        200,
        {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          "X-Request-Id": requestId,
        },
      );
    } catch (error) {
      console.error("geocode_failed", { requestId, message: error.message });
      return errorResponse("GEOCODER_UNAVAILABLE", "Address service is temporarily unavailable", 502, requestId);
    }
  },
};
