"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type ExpensePoint = {
  name: string;
  value: number;
  color: string;
};

export function ExpenseBreakdownChart({
  data,
  total,
}: {
  data: ExpensePoint[];
  total: string;
}) {
  return (
    <div className="flex h-[400px] flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">Expense Breakdown</h3>
        <p className="text-sm text-slate-500">Current allocation from stored records</p>
      </div>
      <div className="relative flex-1">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
            No expense data yet.
          </div>
        )}
        {data.length > 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-xl font-bold text-slate-900">{total}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-600">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
