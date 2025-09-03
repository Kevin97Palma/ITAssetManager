import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendLineChartProps {
  companyId: string;
}

// Mock data for trend chart - in real implementation, this would come from API
const generateMockTrendData = () => {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  
  return months.map((month, index) => ({
    month,
    cost: Math.floor(Math.random() * 5000) + 10000 + (index * 500), // Trending upward
  }));
};

export default function TrendLineChart({ companyId }: TrendLineChartProps) {
  const trendData = generateMockTrendData();

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 28%, 17%, 0.1)" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(215, 20%, 65%)" }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(215, 20%, 65%)" }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Costo"]}
            labelStyle={{ color: "hsl(215, 28%, 17%)" }}
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(215, 28%, 17%, 0.1)",
              borderRadius: "8px",
            }}
          />
          <Line 
            type="monotone" 
            dataKey="cost" 
            stroke="hsl(142, 76%, 36%)" 
            strokeWidth={3}
            dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
