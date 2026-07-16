import {
  BP_DIASTOLIC_CODE,
  BP_SYSTOLIC_CODE,
  HEART_RATE_CODES,
  OXYGEN_SATURATION_CODES,
  conceptHasCode,
  getEffectiveDate,
} from "./vitals";

export type RiskLevel = "high" | "moderate" | "low" | "unknown";

// NOTE: These thresholds are simplified for demo purposes only — they are
// not validated clinical criteria and must not be used for real patient care.

function latestNumericValue(
  observations: fhir4.Observation[],
  codes: string[]
): number | null {
  let latest: { date: string; value: number } | null = null;

  for (const obs of observations) {
    if (!conceptHasCode(obs.code, codes)) continue;
    const date = getEffectiveDate(obs);
    const value = obs.valueQuantity?.value;
    if (!date || value == null) continue;
    if (!latest || date > latest.date) latest = { date, value };
  }

  return latest?.value ?? null;
}

function latestBloodPressure(observations: fhir4.Observation[]): {
  systolic: number | null;
  diastolic: number | null;
} {
  let systolic: number | null = null;
  let diastolic: number | null = null;
  let latestDate: string | null = null;

  for (const obs of observations) {
    const date = getEffectiveDate(obs);
    if (!date) continue;

    const sys =
      obs.component?.find((c) => conceptHasCode(c.code, [BP_SYSTOLIC_CODE]))
        ?.valueQuantity?.value ??
      (conceptHasCode(obs.code, [BP_SYSTOLIC_CODE]) ? obs.valueQuantity?.value : undefined);
    const dia =
      obs.component?.find((c) => conceptHasCode(c.code, [BP_DIASTOLIC_CODE]))
        ?.valueQuantity?.value ??
      (conceptHasCode(obs.code, [BP_DIASTOLIC_CODE]) ? obs.valueQuantity?.value : undefined);

    if (sys == null && dia == null) continue;
    if (!latestDate || date >= latestDate) {
      latestDate = date;
      if (sys != null) systolic = sys;
      if (dia != null) diastolic = dia;
    }
  }

  return { systolic, diastolic };
}

export function assessRisk(
  observations: fhir4.Observation[],
  conditions: fhir4.Condition[],
  medications: fhir4.MedicationRequest[]
): RiskLevel {
  if (
    observations.length === 0 &&
    conditions.length === 0 &&
    medications.length === 0
  ) {
    return "unknown";
  }

  const { systolic, diastolic } = latestBloodPressure(observations);
  const heartRate = latestNumericValue(observations, HEART_RATE_CODES);
  const oxygenSaturation = latestNumericValue(observations, OXYGEN_SATURATION_CODES);
  const conditionCount = conditions.length;
  const medicationCount = medications.length;

  const isHigh =
    (systolic != null && (systolic >= 140 || systolic <= 90)) ||
    (diastolic != null && diastolic >= 90) ||
    (heartRate != null && (heartRate > 120 || heartRate < 50)) ||
    (oxygenSaturation != null && oxygenSaturation < 92) ||
    conditionCount >= 4 ||
    medicationCount >= 5;

  if (isHigh) return "high";

  const isModerate =
    (systolic != null && systolic >= 130 && systolic <= 139) ||
    (conditionCount >= 1 && conditionCount <= 3) ||
    (medicationCount >= 3 && medicationCount <= 4);

  if (isModerate) return "moderate";

  // Anything reaching here has 0 conditions (1+ would have triggered
  // moderate or high above) and no vital sign crossed a threshold. The
  // fully-data-absent case was already handled above, so this is "low"
  // even when vitals happen to be sparse.
  return "low";
}
