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
  name?: string
): Promise<fhir4.Bundle<fhir4.Patient>> {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  return fhirFetch<fhir4.Bundle<fhir4.Patient>>(`/Patient${query}`);
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

export { FhirRequestError };
