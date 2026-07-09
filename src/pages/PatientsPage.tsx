import { Activity } from "lucide-react";

export default function PatientsPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          Patients dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Coming next: patient listing, search, and detail views.
        </p>
      </div>
    </div>
  );
}
