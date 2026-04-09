import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyData {
  month: string;
  year: number;
  income: number;
  expenses: number;
  profit: number;
}

interface RevenueTrendChartProps {
  data: MonthlyData[];
  onPointClick?: (month: string, year: number) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function RevenueTrendChart({ data, onPointClick }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div className="h-64" style={onPointClick ? { cursor: 'pointer' } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onClick={onPointClick
            ? (chartData) => {
                const payload = chartData?.activePayload?.[0]?.payload as MonthlyData | undefined;
                if (payload) onPointClick(payload.month, payload.year);
              }
            : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            labelStyle={{ color: '#111827' }}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
          <Legend />
          <Line type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke="#6366F1" strokeWidth={2}
            dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
