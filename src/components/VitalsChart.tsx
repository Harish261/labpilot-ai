import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalRow } from "../lib/vitals";

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function VitalsChart({ rows }: { rows: VitalRow[] }) {
  const chartable = rows.filter((row) => row.series.length > 0);

  if (chartable.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No vitals with recorded values to chart.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {chartable.map((row) => {
        const data = row.series.map((point) => ({
          ...point,
          dateLabel: formatDate(point.date),
        }));

        return (
          <div key={row.key}>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              {row.label}
            </div>
            <div className="h-40 border border-slate-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  {row.key === "blood-pressure" ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        stroke="#1f4870"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        stroke="#c6a233"
                        connectNulls
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1f4870"
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
