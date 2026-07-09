import { Hono } from "hono";

const FHIR_BASE_URL = process.env.FHIR_BASE_URL;
const FHIR_BEARER_TOKEN = process.env.FHIR_BEARER_TOKEN;
const PORT = Number(process.env.PORT) || 8787;

if (!FHIR_BASE_URL || !FHIR_BEARER_TOKEN) {
  throw new Error(
    "FHIR_BASE_URL and FHIR_BEARER_TOKEN must be set in .env before starting the server."
  );
}

const app = new Hono();

app.get("/health", async (c) => {
  try {
    const upstream = await fetch(`${FHIR_BASE_URL}/Patient?_count=1`, {
      headers: {
        Authorization: `Bearer ${FHIR_BEARER_TOKEN}`,
        Accept: "application/fhir+json",
      },
    });

    if (!upstream.ok) {
      return c.json(
        { status: "error", fhir: "unreachable", httpStatus: upstream.status },
        502
      );
    }

    return c.json({ status: "ok", fhir: "reachable" });
  } catch (err) {
    return c.json(
      {
        status: "error",
        fhir: "unreachable",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      502
    );
  }
});

app.all("/fhir/*", async (c) => {
  const incomingUrl = new URL(c.req.url);
  const forwardPath = incomingUrl.pathname.replace(/^\/fhir/, "");
  const targetUrl = `${FHIR_BASE_URL}${forwardPath}${incomingUrl.search}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set("authorization", `Bearer ${FHIR_BEARER_TOKEN}`);
  headers.set("content-type", "application/json");
  headers.delete("host");

  const upstream = await fetch(targetUrl, {
    method: c.req.method,
    headers,
    body: ["GET", "HEAD"].includes(c.req.method)
      ? undefined
      : await c.req.raw.arrayBuffer(),
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
});

console.log(`FHIR proxy listening on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
