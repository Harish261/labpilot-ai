/**
 * FHIR service layer.
 *
 * All calls go through the backend proxy at /fhir/* (see Phase 1 — Hono
 * server). The bearer token never touches this file or the browser.
 *
 * Until the proxy is running, these calls will fail with a network error —
 * that's expected. The UI is built to handle that gracefully.
 */

const FHIR_BASE = "/fhir";

class FhirRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FhirRequestError";
    this.status = status;
  }
}

async function fhirFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FHIR_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new FhirRequestError(
      "Could not reach the FHIR proxy. Is the backend running?"
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new FhirRequestError(
      `FHIR server returned ${res.status}${detail ? `: ${detail}` : ""}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function searchPatients(
  name?: string,
  gender?: string
): Promise<fhir4.Bundle<fhir4.Patient>> {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (gender) params.set("gender", gender);
  const query = params.toString();
  return fhirFetch<fhir4.Bundle<fhir4.Patient>>(
    `/Patient${query ? `?${query}` : ""}`
  );
}

export async function getPatient(id: string): Promise<fhir4.Patient> {
  return fhirFetch<fhir4.Patient>(`/Patient/${id}`);
}

export async function createPatient(
  patient: fhir4.Patient
): Promise<fhir4.Patient> {
  return fhirFetch<fhir4.Patient>(`/Patient`, {
    method: "POST",
    body: JSON.stringify(patient),
  });
}

export async function updatePatient(
  id: string,
  patient: fhir4.Patient
): Promise<fhir4.Patient> {
  return fhirFetch<fhir4.Patient>(`/Patient/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...patient, id }),
  });
}

export async function getVitals(
  patientId: string
): Promise<fhir4.Bundle<fhir4.Observation>> {
  return fhirFetch<fhir4.Bundle<fhir4.Observation>>(
    `/Observation?patient=${encodeURIComponent(patientId)}&category=vital-signs`
  );
}

export async function getConditions(
  patientId: string
): Promise<fhir4.Bundle<fhir4.Condition>> {
  return fhirFetch<fhir4.Bundle<fhir4.Condition>>(
    `/Condition?patient=${encodeURIComponent(patientId)}&clinical-status=active`
  );
}

export async function getMedications(
  patientId: string
): Promise<fhir4.Bundle<fhir4.MedicationRequest>> {
  return fhirFetch<fhir4.Bundle<fhir4.MedicationRequest>>(
    `/MedicationRequest?patient=${encodeURIComponent(patientId)}&status=active`
  );
}

export async function getMedication(
  medicationId: string
): Promise<fhir4.Medication> {
  return fhirFetch<fhir4.Medication>(`/Medication/${medicationId}`);
}

const SUMMARY_BASE = "/api/summary";

async function summaryFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SUMMARY_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new FhirRequestError(
      "Could not reach the summary service. Is the backend running?"
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      if (typeof body?.error === "string") detail = body.error;
    } catch {
      // ignore — response wasn't JSON
    }
    throw new FhirRequestError(
      detail || `Clinical summary request failed (${res.status})`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function getClinicalSummary(
  patientId: string
): Promise<fhir4.DiagnosticReport | null> {
  const data = await summaryFetch<{ report: fhir4.DiagnosticReport | null }>(
    `/${encodeURIComponent(patientId)}`
  );
  return data.report;
}

export async function generateClinicalSummary(
  patientId: string
): Promise<fhir4.DiagnosticReport> {
  return summaryFetch<fhir4.DiagnosticReport>(
    `/${encodeURIComponent(patientId)}`,
    { method: "POST" }
  );
}

export async function finalizeClinicalSummary(
  report: fhir4.DiagnosticReport,
  conclusion: string,
  performerDisplay: string
): Promise<fhir4.DiagnosticReport> {
  if (!report.id) {
    throw new FhirRequestError("Cannot finalize a report without an id.");
  }

  const updated: fhir4.DiagnosticReport = {
    ...report,
    status: "final",
    conclusion,
    performer: [{ display: performerDisplay }],
    issued: new Date().toISOString(),
  };

  return fhirFetch<fhir4.DiagnosticReport>(`/DiagnosticReport/${report.id}`, {
    method: "PUT",
    body: JSON.stringify(updated),
  });
}

export { FhirRequestError };
