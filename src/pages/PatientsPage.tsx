import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Plus,
  RefreshCw,
  Search,
  X,
  MoreVertical,
  Users,
  Clock,
  Settings,
  UserPlus,
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
  "bg-navy-100 text-navy-800",
  "bg-gold-100 text-gold-700",
  "bg-slate-200 text-slate-700",
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navItems = [
    { label: "Patients", icon: Users, active: true, onClick: undefined },
    { label: "Search", icon: Search, active: false, onClick: focusSearch },
    {
      label: "Create Patient",
      icon: UserPlus,
      active: false,
      onClick: () => setModal({ mode: "create" }),
    },
    { label: "Activity", icon: Clock, active: false, onClick: undefined },
    { label: "Settings", icon: Settings, active: false, onClick: undefined },
  ];

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
    <div className="min-h-screen w-full bg-slate-100 flex flex-col">
      {/* Full-width structural header */}
      <header className="bg-navy-900 text-white">
        <div className="h-14 flex items-center px-6">
          <div className="w-7 h-7 bg-navy-700 flex items-center justify-center border border-navy-600">
            <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="ml-2.5 text-sm font-semibold tracking-wide uppercase">
            LabPilot <span className="text-gold-400">AI</span>
          </span>

          <nav className="ml-10 flex items-center h-14">
            {navItems.map(({ label, icon: Icon, active, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`h-14 px-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-gold-500 text-white"
                    : "border-transparent text-navy-200 hover:text-white hover:border-navy-500"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center text-xs font-semibold border border-navy-500">
              H
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header / page title bar */}
      <div className="bg-white border-b border-slate-300">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Patient Records
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Search the FHIR server by patient name.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(query || undefined)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 hover:bg-slate-50 focus:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white bg-navy-800 hover:bg-navy-900 px-4 py-2 border border-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Patient
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6">
        {/* Search bar */}
        <div className="relative mb-4 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full border border-slate-300 bg-white pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid table */}
        <div className="bg-white border border-slate-300">
          <div className="px-4 py-2 border-b border-slate-300 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
            {loading ? (
              "Loading patients…"
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span>
                <span className="font-semibold text-slate-900">
                  {patients.length}
                </span>{" "}
                matching records
              </span>
            )}
          </div>

          {!loading && !error && patients.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              No patients found. Try a different search, or create one.
            </div>
          )}

          {!loading && patients.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
                    Name
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
                    Gender
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
                    Date of birth
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
                    Phone number
                  </th>
                  <th className="w-10 border border-slate-200"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-2.5 border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 flex items-center justify-center text-xs font-semibold ${avatarColor(
                            p.id
                          )}`}
                        >
                          {initials(p)}
                        </div>
                        <span className="font-medium text-slate-900">
                          {displayName(p)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border border-slate-200 text-slate-600">
                      {genderLabel(p.gender)}
                    </td>
                    <td className="px-4 py-2.5 border border-slate-200 text-slate-600 font-mono text-xs">
                      {p.birthDate ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 border border-slate-200 text-slate-600 font-mono text-xs">
                      {displayPhone(p)}
                    </td>
                    <td className="px-4 py-2.5 border border-slate-200 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((id) => (id === p.id ? null : p.id ?? null));
                        }}
                        aria-label="Row actions"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === p.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-full mt-1 w-32 bg-white border border-slate-300 z-10 text-left"
                        >
                          <button
                            onClick={() => {
                              setModal({ mode: "edit", patient: p });
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </div>
                      )}
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
