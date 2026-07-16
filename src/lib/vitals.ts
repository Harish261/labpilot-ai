const BP_PANEL_CODE = "85354-9";
const BP_SYSTOLIC_CODE = "8480-6";
const BP_DIASTOLIC_CODE = "8462-4";

interface SimpleVitalDef {
  key: string;
  label: string;
  codes: string[];
}

const SIMPLE_VITAL_DEFS: SimpleVitalDef[] = [
  { key: "heart-rate", label: "Heart rate", codes: ["8867-4"] },
  { key: "body-temperature", label: "Body temperature", codes: ["8310-5"] },
  { key: "respiratory-rate", label: "Respiratory rate", codes: ["9279-1"] },
  {
    key: "oxygen-saturation",
    label: "Oxygen saturation",
    codes: ["59408-1", "2708-6"],
  },
  { key: "body-height", label: "Body height", codes: ["8302-2"] },
  { key: "body-weight", label: "Body weight", codes: ["29463-7"] },
  { key: "bmi", label: "BMI", codes: ["39156-5"] },
];

export interface VitalSeriesPoint {
  date: string;
  value?: number;
  systolic?: number;
  diastolic?: number;
}

export interface VitalRow {
  key: string;
  label: string;
  latestDisplay: string | null;
  latestDate: string | null;
  series: VitalSeriesPoint[];
}

function conceptHasCode(
  concept: fhir4.CodeableConcept | undefined,
  codes: string[]
): boolean {
  return !!concept?.coding?.some(
    (c) => c.code != null && codes.includes(c.code)
  );
}

function getEffectiveDate(obs: fhir4.Observation): string | null {
  return obs.effectiveDateTime ?? obs.effectivePeriod?.start ?? obs.issued ?? null;
}

interface SimpleVitalPoint {
  date: string;
  value: number;
  unit: string;
}

function buildSimpleVital(
  observations: fhir4.Observation[],
  def: SimpleVitalDef
): VitalRow {
  const points: SimpleVitalPoint[] = observations
    .filter((o) => conceptHasCode(o.code, def.codes))
    .map((o): SimpleVitalPoint | null => {
      const date = getEffectiveDate(o);
      const value = o.valueQuantity?.value;
      if (!date || value == null) return null;
      return {
        date,
        value,
        unit: o.valueQuantity?.unit ?? o.valueQuantity?.code ?? "",
      };
    })
    .filter((p): p is SimpleVitalPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const last = points[points.length - 1] ?? null;

  return {
    key: def.key,
    label: def.label,
    latestDisplay: last ? `${last.value} ${last.unit}`.trim() : null,
    latestDate: last?.date ?? null,
    series: points.map(({ date, value }) => ({ date, value })),
  };
}

function buildBloodPressure(observations: fhir4.Observation[]): VitalRow {
  const byDate = new Map<
    string,
    { date: string; systolic?: number; diastolic?: number; unit: string }
  >();

  const upsert = (date: string, patch: { systolic?: number; diastolic?: number }, unit: string) => {
    const existing = byDate.get(date) ?? { date, unit };
    byDate.set(date, { ...existing, ...patch, unit: existing.unit || unit });
  };

  for (const obs of observations) {
    const date = getEffectiveDate(obs);
    if (!date) continue;

    if (conceptHasCode(obs.code, [BP_PANEL_CODE]) && obs.component) {
      const sys = obs.component.find((c) => conceptHasCode(c.code, [BP_SYSTOLIC_CODE]))?.valueQuantity;
      const dia = obs.component.find((c) => conceptHasCode(c.code, [BP_DIASTOLIC_CODE]))?.valueQuantity;
      if (sys?.value != null) upsert(date, { systolic: sys.value }, sys.unit ?? "mmHg");
      if (dia?.value != null) upsert(date, { diastolic: dia.value }, dia.unit ?? "mmHg");
    } else if (conceptHasCode(obs.code, [BP_SYSTOLIC_CODE]) && obs.valueQuantity?.value != null) {
      upsert(date, { systolic: obs.valueQuantity.value }, obs.valueQuantity.unit ?? "mmHg");
    } else if (conceptHasCode(obs.code, [BP_DIASTOLIC_CODE]) && obs.valueQuantity?.value != null) {
      upsert(date, { diastolic: obs.valueQuantity.value }, obs.valueQuantity.unit ?? "mmHg");
    }
  }

  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const last = points[points.length - 1] ?? null;

  return {
    key: "blood-pressure",
    label: "Blood pressure",
    latestDisplay: last
      ? `${last.systolic ?? "—"}/${last.diastolic ?? "—"} ${last.unit}`.trim()
      : null,
    latestDate: last?.date ?? null,
    series: points.map(({ date, systolic, diastolic }) => ({ date, systolic, diastolic })),
  };
}

export function buildVitalRows(observations: fhir4.Observation[]): VitalRow[] {
  return [
    buildBloodPressure(observations),
    ...SIMPLE_VITAL_DEFS.map((def) => buildSimpleVital(observations, def)),
  ];
}
