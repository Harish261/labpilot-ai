import type { PatientFormValues } from "../components/PatientForm";

export function patientToFormValues(
  patient: fhir4.Patient
): PatientFormValues {
  const name = patient.name?.[0];
  const phone = patient.telecom?.find((t) => t.system === "phone")?.value;

  return {
    given: name?.given?.[0] ?? "",
    family: name?.family ?? "",
    gender: (patient.gender as PatientFormValues["gender"]) ?? "unknown",
    birthDate: patient.birthDate ?? "",
    phone: phone ?? "",
  };
}

export function formValuesToPatient(
  values: PatientFormValues
): fhir4.Patient {
  const patient: fhir4.Patient = {
    resourceType: "Patient",
    name: [
      {
        given: [values.given.trim()],
        family: values.family.trim(),
      },
    ],
    gender: values.gender,
    birthDate: values.birthDate,
  };

  if (values.phone.trim()) {
    patient.telecom = [{ system: "phone", value: values.phone.trim() }];
  }

  return patient;
}

export function displayName(patient: fhir4.Patient): string {
  const name = patient.name?.[0];
  if (!name) return "Unnamed patient";
  return [name.given?.join(" "), name.family].filter(Boolean).join(" ");
}

export function initials(patient: fhir4.Patient): string {
  const name = patient.name?.[0];
  const g = name?.given?.[0]?.[0] ?? "";
  const f = name?.family?.[0] ?? "";
  return (g + f).toUpperCase() || "?";
}

export function displayPhone(patient: fhir4.Patient): string {
  return patient.telecom?.find((t) => t.system === "phone")?.value ?? "—";
}

export function genderLabel(gender?: string): string {
  if (!gender) return "Unknown";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
