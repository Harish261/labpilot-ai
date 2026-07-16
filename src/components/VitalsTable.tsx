import type { VitalRow } from "../lib/vitals";

function formatDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VitalsTable({ rows }: { rows: VitalRow[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
            Vital
          </th>
          <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
            Value
          </th>
          <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border border-slate-200">
            Date recorded
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="px-4 py-2.5 border border-slate-200 font-medium text-slate-900">
              {row.label}
            </td>
            <td className="px-4 py-2.5 border border-slate-200 text-slate-600 font-mono text-xs">
              {row.latestDisplay ?? (
                <span className="text-slate-400 italic font-sans">
                  Not recorded
                </span>
              )}
            </td>
            <td className="px-4 py-2.5 border border-slate-200 text-slate-600 font-mono text-xs">
              {formatDate(row.latestDate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
