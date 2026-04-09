import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdownChartProps {
  data: CategoryBreakdown[];
  viewType?: 'chart' | 'pie' | 'table';
  onCategoryClick?: (categoryName: string) => void;
}

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function ExpenseBreakdownChart({ data, viewType = 'pie', onCategoryClick }: ExpenseBreakdownChartProps) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No expense data available</div>;
  }

  const topCategories = data.slice(0, 8);
  const otherCategories = data.slice(8);
  const chartData = otherCategories.length > 0
    ? [...topCategories, {
        categoryId: 'other',
        categoryName: 'Other',
        amount: otherCategories.reduce((s, c) => s + c.amount, 0),
        percentage: otherCategories.reduce((s, c) => s + c.percentage, 0),
      }]
    : topCategories;

  if (viewType === 'chart') {
    return (
      <div className="h-64" style={onCategoryClick ? { cursor: 'pointer' } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatCurrency} />
            <YAxis type="category" dataKey="categoryName" width={70} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Bar
              dataKey="amount"
              radius={[0, 4, 4, 0]}
              onClick={onCategoryClick ? (d) => onCategoryClick(d.categoryName) : undefined}
              style={onCategoryClick ? { cursor: 'pointer' } : undefined}
            >
              {chartData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64" style={onCategoryClick ? { cursor: 'pointer' } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="amount"
            nameKey="categoryName"
            onClick={onCategoryClick ? (d) => onCategoryClick(d.categoryName) : undefined}
          >
            {chartData.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Amount']}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
          <Legend layout="vertical" align="right" verticalAlign="middle"
            formatter={(v: string) => <span className="text-sm">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
