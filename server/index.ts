import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const FHIR_BASE_URL = process.env.FHIR_BASE_URL;
const FHIR_BEARER_TOKEN = process.env.FHIR_BEARER_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = Number(process.env.PORT) || 8787;
const STATIC_ROOT = process.env.STATIC_ROOT || "./dist";

const GROQ_MODEL = "openai/gpt-oss-120b";
const AI_SUMMARY_CODE_TEXT = "AI-Generated Clinical Summary";

if (!FHIR_BASE_URL || !FHIR_BEARER_TOKEN) {
  throw new Error(
    "FHIR_BASE_URL and FHIR_BEARER_TOKEN must be set in .env before starting the server."
  );
}

const app = new Hono();

// Shared FHIR request helpers — used by the /fhir/* proxy below and by the
// /api/summary routes, so the base URL + bearer token logic lives in one place.
function fhirUrl(path: string): string {
  return `${FHIR_BASE_URL}${path}`;
}

function fhirHeaders(base?: Headers): Headers {
  const headers = new Headers(base);
  headers.set("authorization", `Bearer ${FHIR_BEARER_TOKEN}`);
  return headers;
}

function resourcesOf<T extends fhir4.Resource>(bundle: fhir4.Bundle<T>): T[] {
  return (bundle.entry?.map((e) => e.resource).filter(Boolean) ?? []) as T[];
}

async function fhirFetchJson<T>(path: string): Promise<T> {
  const headers = fhirHeaders();
  headers.set("Accept", "application/fhir+json");

  const res = await fetch(fhirUrl(path), { headers });
  if (!res.ok) {
    throw new Error(`FHIR request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

async function fhirPostJson<T>(path: string, body: unknown): Promise<T> {
  const headers = fhirHeaders();
  headers.set("Content-Type", "application/fhir+json");
  headers.set("Accept", "application/fhir+json");

  const res = await fetch(fhirUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `FHIR create failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  return res.json() as Promise<T>;
}

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
  const targetUrl = fhirUrl(`${forwardPath}${incomingUrl.search}`);

  const headers = fhirHeaders(c.req.raw.headers);
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

function formatObservation(obs: fhir4.Observation): string {
  const label = obs.code?.text ?? obs.code?.coding?.[0]?.display ?? "Observation";
  const date =
    obs.effectiveDateTime ?? obs.effectivePeriod?.start ?? obs.issued ?? "unknown date";

  let value: string;
  if (obs.valueQuantity?.value != null) {
    value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ""}`.trim();
  } else if (obs.component?.length) {
    value = obs.component
      .map((c) => {
        const cLabel = c.code?.text ?? c.code?.coding?.[0]?.display ?? "value";
        const cValue =
          c.valueQuantity?.value != null
            ? `${c.valueQuantity.value} ${c.valueQuantity.unit ?? ""}`.trim()
            : "—";
        return `${cLabel} ${cValue}`;
      })
      .join(", ");
  } else {
    value = "—";
  }

  return `- ${label}: ${value} (${date})`;
}

function formatCondition(cond: fhir4.Condition): string {
  const label = cond.code?.text ?? cond.code?.coding?.[0]?.display ?? "Unspecified condition";
  const onset = cond.onsetDateTime ?? "unknown onset";
  return `- ${label} (onset: ${onset})`;
}

async function formatMedication(req: fhir4.MedicationRequest): Promise<string> {
  let name = "Unknown medication";

  if (req.medicationCodeableConcept) {
    name =
      req.medicationCodeableConcept.text ??
      req.medicationCodeableConcept.coding?.[0]?.display ??
      name;
  } else if (req.medicationReference?.reference) {
    const medId = req.medicationReference.reference.split("/").pop();
    if (medId) {
      try {
        const med = await fhirFetchJson<fhir4.Medication>(`/Medication/${medId}`);
        name = med.code?.text ?? med.code?.coding?.[0]?.display ?? name;
      } catch {
        name = req.medicationReference.display ?? name;
      }
    }
  }

  const dosage = req.dosageInstruction?.[0]?.text;
  return `- ${name}${dosage ? ` — ${dosage}` : ""}`;
}

async function buildClinicalContext(patientId: string): Promise<string> {
  const [vitalsBundle, conditionsBundle, medicationsBundle] = await Promise.all([
    fhirFetchJson<fhir4.Bundle<fhir4.Observation>>(
      `/Observation?patient=${patientId}&category=vital-signs`
    ),
    fhirFetchJson<fhir4.Bundle<fhir4.Condition>>(
      `/Condition?patient=${patientId}&clinical-status=active`
    ),
    fhirFetchJson<fhir4.Bundle<fhir4.MedicationRequest>>(
      `/MedicationRequest?patient=${patientId}&status=active`
    ),
  ]);

  const vitals = resourcesOf(vitalsBundle);
  const conditions = resourcesOf(conditionsBundle);
  const medications = resourcesOf(medicationsBundle);
  const medicationLines = await Promise.all(medications.map(formatMedication));

  return [
    "Vitals:",
    vitals.length ? vitals.map(formatObservation).join("\n") : "- None recorded",
    "",
    "Active Conditions:",
    conditions.length ? conditions.map(formatCondition).join("\n") : "- None recorded",
    "",
    "Active Medications:",
    medicationLines.length ? medicationLines.join("\n") : "- None recorded",
  ].join("\n");
}

async function generateSummaryText(context: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY must be set to generate a clinical summary.");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are assisting a reviewing physician by drafting a concise clinical summary " +
            "from structured patient data. Write 3-4 sentences that factually synthesize the " +
            "vitals, active conditions, and active medications provided. Do not propose new " +
            "diagnoses and do not suggest medication changes. If the data looks sparse or " +
            "incomplete, say so plainly in the summary rather than speculating.",
        },
        {
          role: "user",
          content: `Patient clinical data:\n\n${context}\n\nWrite the clinical summary.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty summary.");
  }
  return text;
}

app.get("/api/summary/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  try {
    const bundle = await fhirFetchJson<fhir4.Bundle<fhir4.DiagnosticReport>>(
      `/DiagnosticReport?subject=Patient/${patientId}&_sort=-date`
    );
    const reports = resourcesOf(bundle).filter(
      (r) => r.code?.text === AI_SUMMARY_CODE_TEXT
    );
    return c.json({ report: reports[0] ?? null });
  } catch (err) {
    return c.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load clinical summary.",
      },
      502
    );
  }
});

app.post("/api/summary/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  try {
    const context = await buildClinicalContext(patientId);
    const summaryText = await generateSummaryText(context);

    const report: fhir4.DiagnosticReport = {
      resourceType: "DiagnosticReport",
      status: "preliminary",
      code: { text: AI_SUMMARY_CODE_TEXT },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: new Date().toISOString(),
      // DiagnosticReport.note isn't part of R4 (added in R5), so the
      // AI-authorship / pending-review disclaimer is folded into the
      // conclusion text itself to stay valid FHIR R4.
      conclusion: `${summaryText}\n\n[AI-generated summary — pending physician review.]`,
    };

    const created = await fhirPostJson<fhir4.DiagnosticReport>(
      "/DiagnosticReport",
      report
    );

    return c.json(created);
  } catch (err) {
    return c.json(
      {
        error:
          err instanceof Error ? err.message : "Could not generate clinical summary.",
      },
      502
    );
  }
});

// Everything that isn't /fhir/* or /health falls through to the built
// frontend. Static assets are served directly; anything else (client-side
// routes like /patients/123) falls back to index.html for react-router.
app.use("*", serveStatic({ root: STATIC_ROOT }));
app.get("*", serveStatic({ path: "index.html", root: STATIC_ROOT }));

console.log(`FHIR proxy listening on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
