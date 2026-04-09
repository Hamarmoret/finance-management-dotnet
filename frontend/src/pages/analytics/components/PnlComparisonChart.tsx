import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

interface PnlCenterStats {
  id: string;
  name: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

interface PnlComparisonChartProps {
  data: PnlCenterStats[];
  viewType?: 'chart' | 'pie' | 'table';
  onPnlClick?: (id: string, name: string) => void;
}

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function PnlComparisonChart({ data, viewType = 'chart', onPnlClick }: PnlComparisonChartProps) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No P&L centers available</div>;
  }

  const chartData = [...data]
    .map(pnl => ({
      id: pnl.id,
      name: pnl.name.length > 15 ? pnl.name.substring(0, 15) + '…' : pnl.name,
      fullName: pnl.name,
      profit: pnl.netProfit,
      income: pnl.totalIncome,
      expenses: pnl.totalExpenses,
    }))
    .sort((a, b) => b.profit - a.profit);

  if (viewType === 'pie') {
    const pieData = data
      .filter(pnl => pnl.totalIncome > 0)
      .map(pnl => ({ id: pnl.id, name: pnl.name, value: pnl.totalIncome }));

    return (
      <div className="h-64" style={onPnlClick ? { cursor: 'pointer' } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              onClick={onPnlClick ? (d) => onPnlClick(d.id, d.name) : undefined}
            >
              {pieData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Income']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle"
              formatter={(v: string) => <span className="text-sm">{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64" style={onPnlClick ? { cursor: 'pointer' } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          onClick={onPnlClick
            ? (chartState) => {
                const payload = chartState?.activePayload?.[0]?.payload;
                if (payload) onPnlClick(payload.id, payload.fullName);
              }
            : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal />
          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} width={70} />
          <Tooltip
            formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'profit' ? 'Net Profit' : name]}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? _label}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
          <ReferenceLine x={0} stroke="#9CA3AF" />
          <Bar dataKey="profit" name="Net Profit" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
