import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Plus,
  RefreshCw,
  Search,
  X,
  MoreVertical,
} from "lucide-react";
import {
  searchPatients,
  createPatient,
  updatePatient,
  FhirRequestError,
} from "../lib/fhir";
import {
  displayName,
  displayPhone,
  initials,
  patientToFormValues,
  formValuesToPatient,
} from "../lib/patient-mapper";
import PatientForm, { type PatientFormValues } from "../components/PatientForm";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function avatarColor(id: string | undefined) {
  if (!id) return AVATAR_COLORS[0];
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function genderLabel(g?: string) {
  if (!g) return "Unknown";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<fhir4.Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; patient: fhir4.Patient }
    | null
  >(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (name?: string) => {
    setLoading(true);
    setError("");
    try {
      const bundle = await searchPatients(name);
      const results =
        bundle.entry?.map((e) => e.resource).filter(Boolean) as
          | fhir4.Patient[]
          | undefined;
      setPatients(results ?? []);
    } catch (err) {
      if (err instanceof FhirRequestError) {
        setError(err.message);
      } else {
        setError("Something went wrong loading patients.");
      }
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handle = setTimeout(() => {
      load(query || undefined);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleCreate = async (values: PatientFormValues) => {
    setSaving(true);
    try {
      await createPatient(formValuesToPatient(values));
      setModal(null);
      await load(query || undefined);
    } catch (err) {
      setError(
        err instanceof FhirRequestError
          ? err.message
          : "Could not create patient."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (values: PatientFormValues) => {
    if (modal?.mode !== "edit" || !modal.patient.id) return;
    setSaving(true);
    try {
      await updatePatient(modal.patient.id, formValuesToPatient(values));
      setModal(null);
      await load(query || undefined);
    } catch (err) {
      setError(
        err instanceof FhirRequestError
          ? err.message
          : "Could not update patient."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-slate-900 tracking-tight">
            LabPilot <span className="text-blue-600">AI</span>
          </span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
            <Search className="w-4 h-4" />
            Patients
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 max-w-5xl">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Search Patients
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Find patients on the FHIR server by typing all or part of a
              name.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(query || undefined)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 focus:outline-none"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              Create Patient
            </button>
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500">
            {loading ? (
              "Loading patients…"
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {patients.length}
                </span>{" "}
                matching patients
              </>
            )}
          </div>

          {!loading && !error && patients.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              No patients found. Try a different search, or create one.
            </div>
          )}

          {!loading && patients.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Gender</th>
                  <th className="px-5 py-2.5 font-medium">Date of birth</th>
                  <th className="px-5 py-2.5 font-medium">Phone number</th>
                  <th className="px-5 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setModal({ mode: "edit", patient: p })}
                  >
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(
                          p.id
                        )}`}
                      >
                        {initials(p)}
                      </div>
                      <span className="font-medium text-slate-900">
                        {displayName(p)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {genderLabel(p.gender)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {p.birthDate ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {displayPhone(p)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Row actions"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modal?.mode === "create" && (
        <PatientForm
          title="Create patient"
          submitLabel="Create patient"
          submitting={saving}
          onSubmit={handleCreate}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.mode === "edit" && (
        <PatientForm
          title="Edit patient"
          initialValues={patientToFormValues(modal.patient)}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleEdit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
