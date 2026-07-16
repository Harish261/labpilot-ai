import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import Header, { type NavItem } from "../components/Header";
import {
  searchPatients,
  createPatient,
  updatePatient,
  FhirRequestError,
} from "../lib/fhir";
import {
  displayName,
  displayPhone,
  genderLabel,
  initials,
  patientToFormValues,
  formValuesToPatient,
} from "../lib/patient-mapper";
import PatientForm, { type PatientFormValues } from "../components/PatientForm";

function genderColorClasses(gender?: string): string {
  switch (gender) {
    case "male":
      return "bg-sky-100 text-sky-700";
    case "female":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function genderAccentClasses(gender?: string): string {
  switch (gender) {
    case "male":
      return "bg-sky-500";
    case "female":
      return "bg-pink-500";
    default:
      return "bg-slate-400";
  }
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<fhir4.Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; patient: fhir4.Patient }
    | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (name?: string, gender?: string) => {
    setLoading(true);
    setError("");
    try {
      const bundle = await searchPatients(name, gender);
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
      load(query || undefined, genderFilter || undefined);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, genderFilter]);

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

  const navItems: NavItem[] = [
    { label: "Patients", icon: Users, active: true },
    { label: "Search", icon: Search, active: false, onClick: focusSearch },
    {
      label: "Create Patient",
      icon: UserPlus,
      active: false,
      onClick: () => setModal({ mode: "create" }),
    },
    { label: "Activity", icon: Clock, active: false },
    { label: "Settings", icon: Settings, active: false },
  ];

  const handleCreate = async (values: PatientFormValues) => {
    setSaving(true);
    try {
      await createPatient(formValuesToPatient(values));
      setModal(null);
      await load(query || undefined, genderFilter || undefined);
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
      await load(query || undefined, genderFilter || undefined);
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
      <Header navItems={navItems} />

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
              onClick={() => load(query || undefined, genderFilter || undefined)}
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
        {/* Search bar + gender filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative max-w-md flex-1">
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

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>

          {genderFilter && (
            <button
              onClick={() => setGenderFilter("")}
              className="text-xs font-semibold text-navy-700 hover:text-navy-800 underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Card feed */}
        <div className="bg-white border border-slate-300 border-t-2 border-t-gold-500">
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

          <div className="p-3">
            {loading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-stretch rounded-md border border-slate-200 overflow-hidden animate-pulse"
                  >
                    <div className="w-1 bg-slate-200 shrink-0" />
                    <div className="flex-1 flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3.5 w-40 bg-slate-200 rounded" />
                        <div className="h-2.5 w-56 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && patients.length === 0 && (
              <div className="px-5 py-12 flex flex-col items-center justify-center text-center gap-2">
                <Users className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400">
                  No patients found. Try a different search, or create one.
                </p>
              </div>
            )}

            {!loading && patients.length > 0 && (
              <div className="flex flex-col gap-2">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => p.id && navigate(`/patient/${p.id}`)}
                    className="group flex items-stretch rounded-md border border-slate-200 bg-white overflow-hidden cursor-pointer transition-colors hover:border-navy-300 hover:shadow-sm relative"
                  >
                    <div
                      className={`w-1 shrink-0 ${genderAccentClasses(p.gender)}`}
                    />
                    <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${genderColorClasses(
                          p.gender
                        )}`}
                      >
                        {initials(p)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {displayName(p)}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {genderLabel(p.gender)} &middot; DOB{" "}
                          {p.birthDate ?? "—"} &middot; {displayPhone(p)}
                        </p>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((id) =>
                              id === p.id ? null : p.id ?? null
                            );
                          }}
                          aria-label="Row actions"
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === p.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-300 z-10 text-left"
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
