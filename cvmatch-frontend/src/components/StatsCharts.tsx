import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface ChartProps {
  data: any[];
  title: string;
  subtitle?: string;
  type: 'bar' | 'pie' | 'area' | 'horizontal-bar';
  colors?: string[];
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatsChart: React.FC<ChartProps> = ({
  data,
  title,
  subtitle,
  type,
  colors = COLORS,
  dataKey = 'value',
  xAxisKey = 'name',
  yAxisKey
}) => {
  const chartStyles = {
    card: {
      background: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(59, 130, 246, 0.2)",
      borderRadius: "16px",
      padding: "1.5rem",
      transition: "all 0.3s ease"
    } as React.CSSProperties,
    header: {
      marginBottom: "1.5rem"
    } as React.CSSProperties,
    title: {
      margin: 0,
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#e5e7eb"
    } as React.CSSProperties,
    subtitle: {
      margin: "0.5rem 0 0 0",
      color: "#94a3b8",
      fontSize: "0.9rem"
    } as React.CSSProperties,
    container: {
      width: "100%",
      height: "300px"
    } as React.CSSProperties
  };

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#e5e7eb'
  };

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`color${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                fillOpacity={1} 
                fill={`url(#color${title.replace(/\s/g, '')})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'horizontal-bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey={xAxisKey} type="category" stroke="#9ca3af" width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={dataKey} fill={colors[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Type de graphique non supporté</div>;
    }
  };

  return (
    <div style={chartStyles.card}>
      <div style={chartStyles.header}>
        <h3 style={chartStyles.title}>{title}</h3>
        {subtitle && <p style={chartStyles.subtitle}>{subtitle}</p>}
      </div>
      <div style={chartStyles.container}>
        {renderChart()}
      </div>
    </div>
  );
};

export default StatsChart;