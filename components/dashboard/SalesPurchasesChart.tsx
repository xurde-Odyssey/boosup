"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartPoint = {
  name: string;
  sales: number;
  purchases: number;
};

export function SalesPurchasesChart({
  data,
  compact = false,
  className,
}: {
  data: ChartPoint[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        compact
          ? "h-[320px]"
          : "h-[400px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50",
        className,
      )}
    >
      {!compact ? (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Monthly Sales vs Purchases</h3>
            <p className="text-sm text-slate-500">Live summary based on stored transactions</p>
          </div>
        </div>
      ) : null}
      <div className={compact ? "h-full w-full" : "h-[300px] w-full"}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(value) => `Rs. ${value}`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingTop: "0px", paddingBottom: "20px" }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                name="Purchases"
                stroke="#94a3b8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPurchases)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 text-sm text-slate-500">
            No sales or purchase chart data yet.
          </div>
        )}
      </div>
    </div>
  );
}
