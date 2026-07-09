import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

export interface PatientFormValues {
  given: string;
  family: string;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  phone: string;
}

interface PatientFormProps {
  title: string;
  initialValues?: Partial<PatientFormValues>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: PatientFormValues) => void;
  onClose: () => void;
}

const emptyValues: PatientFormValues = {
  given: "",
  family: "",
  gender: "unknown",
  birthDate: "",
  phone: "",
};

export default function PatientForm({
  title,
  initialValues,
  submitLabel,
  submitting = false,
  onSubmit,
  onClose,
}: PatientFormProps) {
  const [values, setValues] = useState<PatientFormValues>({
    ...emptyValues,
    ...initialValues,
  });
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleChange =
    (field: keyof PatientFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
    };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!values.given.trim() || !values.family.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!values.birthDate) {
      setError("Date of birth is required.");
      return;
    }
    if (values.birthDate > today) {
      setError("Date of birth can't be in the future.");
      return;
    }

    onSubmit(values);
  };

  const labelClass =
    "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";
  const inputClass =
    "w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-300">
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 border-b-2 border-gold-500">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-navy-200 hover:text-white focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input
                value={values.given}
                onChange={handleChange("given")}
                className={inputClass}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                value={values.family}
                onChange={handleChange("family")}
                className={inputClass}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={values.gender}
                onChange={handleChange("gender")}
                className={`${inputClass} bg-white`}
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input
                type="date"
                value={values.birthDate}
                onChange={handleChange("birthDate")}
                max={today}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Phone number{" "}
              <span className="text-slate-400 normal-case font-normal">
                (optional)
              </span>
            </label>
            <input
              type="tel"
              value={values.phone}
              onChange={handleChange("phone")}
              className={`${inputClass} font-mono`}
              placeholder="+1 (415) 555-0198"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 border border-slate-300 hover:bg-slate-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white bg-navy-800 hover:bg-navy-900 disabled:bg-navy-400 border border-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
