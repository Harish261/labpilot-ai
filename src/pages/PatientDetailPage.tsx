import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Search,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import Header, { type NavItem } from "../components/Header";
import VitalsChart from "../components/VitalsChart";
import VitalsTable from "../components/VitalsTable";
import {
  FhirRequestError,
  finalizeClinicalSummary,
  generateClinicalSummary,
  getClinicalSummary,
  getConditions,
  getMedication,
  getMedications,
  getPatient,
  getVitals,
  resourcesOf,
} from "../lib/fhir";
import { displayName, genderLabel } from "../lib/patient-mapper";
import { buildVitalRows, type VitalRow } from "../lib/vitals";

interface MedicationRow {
  id: string;
  name: string;
  dosageText: string | null;
  status: string | undefined;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof FhirRequestError ? err.message : fallback;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<fhir4.Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState("");

  const [summary, setSummary] = useState<fhir4.DiagnosticReport | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryFinalizing, setSummaryFinalizing] = useState(false);
  const [draftConclusion, setDraftConclusion] = useState("");

  const [vitals, setVitals] = useState<VitalRow[] | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(true);
  const [vitalsError, setVitalsError] = useState("");
  const [vitalsView, setVitalsView] = useState<"table" | "chart">("table");

  const [conditions, setConditions] = useState<fhir4.Condition[] | null>(null);
  const [conditionsLoading, setConditionsLoading] = useState(true);
  const [conditionsError, setConditionsError] = useState("");

  const [medications, setMedications] = useState<MedicationRow[] | null>(null);
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [medicationsError, setMedicationsError] = useState("");

  useEffect(() => {
    if (!id) return;
    setPatientLoading(true);
    setPatientError("");
    getPatient(id)
      .then(setPatient)
      .catch((err) => setPatientError(errorMessage(err, "Could not load patient.")))
      .finally(() => setPatientLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setSummaryLoading(true);
    setSummaryError("");
    getClinicalSummary(id)
      .then((report) => {
        setSummary(report);
        setDraftConclusion(report?.conclusion ?? "");
      })
      .catch((err) =>
        setSummaryError(errorMessage(err, "Could not load clinical summary."))
      )
      .finally(() => setSummaryLoading(false));
  }, [id]);

  async function handleGenerateSummary() {
    if (!id) return;
    setSummaryGenerating(true);
    setSummaryError("");
    try {
      const report = await generateClinicalSummary(id);
      setSummary(report);
      setDraftConclusion(report.conclusion ?? "");
    } catch (err) {
      setSummaryError(errorMessage(err, "Could not generate clinical summary."));
    } finally {
      setSummaryGenerating(false);
    }
  }

  async function handleFinalizeSummary() {
    if (!summary) return;
    setSummaryFinalizing(true);
    setSummaryError("");
    try {
      const finalized = await finalizeClinicalSummary(
        summary,
        draftConclusion,
        "Dr. [placeholder]"
      );
      setSummary(finalized);
      setDraftConclusion(finalized.conclusion ?? "");
    } catch (err) {
      setSummaryError(errorMessage(err, "Could not finalize clinical summary."));
    } finally {
      setSummaryFinalizing(false);
    }
  }

  function handleDiscardSummary() {
    setSummary(null);
    setDraftConclusion("");
    setSummaryError("");
  }

  useEffect(() => {
    if (!id) return;
    setVitalsLoading(true);
    setVitalsError("");
    getVitals(id)
      .then((bundle) => setVitals(buildVitalRows(resourcesOf(bundle))))
      .catch((err) => setVitalsError(errorMessage(err, "Could not load vitals.")))
      .finally(() => setVitalsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setConditionsLoading(true);
    setConditionsError("");
    getConditions(id)
      .then((bundle) => setConditions(resourcesOf(bundle)))
      .catch((err) => setConditionsError(errorMessage(err, "Could not load conditions.")))
      .finally(() => setConditionsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setMedicationsLoading(true);
    setMedicationsError("");

    (async () => {
      try {
        const bundle = await getMedications(id);
        const requests = resourcesOf(bundle);

        const rows = await Promise.all(
          requests.map(async (req): Promise<MedicationRow> => {
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
                  const med = await getMedication(medId);
                  name = med.code?.text ?? med.code?.coding?.[0]?.display ?? name;
                } catch {
                  name = req.medicationReference.display ?? name;
                }
              }
            }

            return {
              id: req.id ?? `${name}-${Math.random()}`,
              name,
              dosageText: req.dosageInstruction?.[0]?.text ?? null,
              status: req.status,
            };
          })
        );

        if (!cancelled) setMedications(rows);
      } catch (err) {
        if (!cancelled) {
          setMedicationsError(errorMessage(err, "Could not load medications."));
        }
      } finally {
        if (!cancelled) setMedicationsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const navItems: NavItem[] = [
    { label: "Patients", icon: Users, active: true, onClick: () => navigate("/patients") },
    { label: "Search", icon: Search, active: false, onClick: () => navigate("/patients") },
    {
      label: "Create Patient",
      icon: UserPlus,
      active: false,
      onClick: () => navigate("/patients"),
    },
    { label: "Activity", icon: Clock, active: false },
    { label: "Settings", icon: Settings, active: false },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col">
      <Header navItems={navItems} />

      <div className="bg-white border-b border-slate-300">
        <div className="px-6 py-4">
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-navy-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to patients
          </Link>
        </div>
      </div>

      <main className="flex-1 p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Demographics */}
        <section className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Demographics
            </h2>
          </div>
          <div className="p-5">
            {patientLoading && (
              <p className="text-sm text-slate-400">Loading patient…</p>
            )}
            {!patientLoading && patientError && (
              <p className="text-sm text-red-600">{patientError}</p>
            )}
            {!patientLoading && !patientError && patient && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">
                    Name
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {displayName(patient)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">
                    Gender
                  </div>
                  <div className="text-sm text-slate-900 mt-0.5">
                    {genderLabel(patient.gender)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">
                    Date of birth
                  </div>
                  <div className="text-sm text-slate-900 mt-0.5 font-mono">
                    {patient.birthDate ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">
                    Patient ID
                  </div>
                  <div className="text-sm text-slate-900 mt-0.5 font-mono">
                    {patient.id}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Clinical Summary */}
        <section className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Clinical Summary
            </h2>
            {summary?.status === "preliminary" && (
              <span className="text-xs font-semibold uppercase tracking-wide text-gold-700 bg-gold-100 border border-gold-300 px-2 py-0.5">
                Preliminary — Pending Review
              </span>
            )}
            {summary?.status === "final" && (
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-100 border border-green-300 px-2 py-0.5">
                Final
              </span>
            )}
          </div>
          <div className="p-5">
            {summaryLoading && (
              <p className="text-sm text-slate-400">Loading clinical summary…</p>
            )}

            {!summaryLoading && summaryError && (
              <p className="text-sm text-red-600 mb-3">{summaryError}</p>
            )}

            {!summaryLoading && !summary && (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  No AI-generated summary yet for this patient.
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={summaryGenerating}
                  className="text-xs font-semibold uppercase tracking-wide text-white bg-navy-800 hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 border border-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
                >
                  {summaryGenerating ? "Generating summary…" : "Generate AI Summary"}
                </button>
              </div>
            )}

            {!summaryLoading && summary?.status === "preliminary" && (
              <div className="space-y-3">
                <textarea
                  value={draftConclusion}
                  onChange={(e) => setDraftConclusion(e.target.value)}
                  rows={5}
                  disabled={summaryFinalizing}
                  className="w-full border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600 disabled:opacity-50"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFinalizeSummary}
                    disabled={summaryFinalizing || !draftConclusion.trim()}
                    className="text-xs font-semibold uppercase tracking-wide text-white bg-navy-800 hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 border border-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
                  >
                    {summaryFinalizing ? "Finalizing…" : "Approve & Finalize"}
                  </button>
                  <button
                    onClick={handleDiscardSummary}
                    disabled={summaryFinalizing}
                    className="text-xs font-semibold uppercase tracking-wide text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 px-4 py-2 border border-slate-300"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {!summaryLoading && summary?.status === "final" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {summary.conclusion}
                </p>
                <p className="text-xs text-slate-400">
                  Reviewed by {summary.performer?.[0]?.display ?? "Unknown"}
                  {" · "}
                  {summary.issued ? new Date(summary.issued).toLocaleString() : "—"}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Vitals */}
        <section className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Vitals
            </h2>
            <div className="flex border border-slate-300">
              <button
                onClick={() => setVitalsView("table")}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  vitalsView === "table"
                    ? "bg-navy-800 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setVitalsView("chart")}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide border-l border-slate-300 ${
                  vitalsView === "chart"
                    ? "bg-navy-800 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Chart
              </button>
            </div>
          </div>
          <div className="p-5">
            {vitalsLoading && (
              <p className="text-sm text-slate-400">Loading vitals…</p>
            )}
            {!vitalsLoading && vitalsError && (
              <p className="text-sm text-red-600">{vitalsError}</p>
            )}
            {!vitalsLoading && !vitalsError && vitals && (
              vitalsView === "table" ? (
                <VitalsTable rows={vitals} />
              ) : (
                <VitalsChart rows={vitals} />
              )
            )}
          </div>
        </section>

        {/* Conditions */}
        <section className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Active Conditions
            </h2>
          </div>
          <div className="p-5">
            {conditionsLoading && (
              <p className="text-sm text-slate-400">Loading conditions…</p>
            )}
            {!conditionsLoading && conditionsError && (
              <p className="text-sm text-red-600">{conditionsError}</p>
            )}
            {!conditionsLoading && !conditionsError && conditions && (
              conditions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No active conditions recorded.
                </p>
              ) : (
                <ul className="space-y-2">
                  {conditions.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-baseline justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-sm text-slate-900">
                        {c.code?.text ?? c.code?.coding?.[0]?.display ?? "Unspecified condition"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {c.onsetDateTime ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </section>

        {/* Medications */}
        <section className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Current Medications
            </h2>
          </div>
          <div className="p-5">
            {medicationsLoading && (
              <p className="text-sm text-slate-400">Loading medications…</p>
            )}
            {!medicationsLoading && medicationsError && (
              <p className="text-sm text-red-600">{medicationsError}</p>
            )}
            {!medicationsLoading && !medicationsError && medications && (
              medications.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No active medications recorded.
                </p>
              ) : (
                <ul className="space-y-3">
                  {medications.map((m) => (
                    <li
                      key={m.id}
                      className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">
                          {m.name}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-navy-700 font-semibold">
                          {m.status}
                        </span>
                      </div>
                      {m.dosageText && (
                        <p className="text-xs text-slate-500 mt-1">{m.dosageText}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
