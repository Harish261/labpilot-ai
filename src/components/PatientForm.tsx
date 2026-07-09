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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                First name
              </label>
              <input
                value={values.given}
                onChange={handleChange("given")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Last name
              </label>
              <input
                value={values.family}
                onChange={handleChange("family")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Gender
              </label>
              <select
                value={values.gender}
                onChange={handleChange("gender")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date of birth
              </label>
              <input
                type="date"
                value={values.birthDate}
                onChange={handleChange("birthDate")}
                max={today}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone number{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={values.phone}
              onChange={handleChange("phone")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
