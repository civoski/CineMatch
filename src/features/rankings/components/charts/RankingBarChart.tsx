"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RankingStatConfig } from "../../actions";

interface RankingBarChartProps {
  data: RankingStatConfig[];
  selectedIndex: number | null;
  onSelectItem: (index: number) => void;
}

// Paleta de colores del sistema de diseño (chart-1 a chart-10)
const BAR_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
];

const chartConfig = {
  count: {
    label: "Películas",
    color: "hsl(var(--chart-1))",
  },
  avgRating: {
    label: "Rating Promedio",
  },
  percentage: {
    label: "Porcentaje",
  },
} satisfies ChartConfig;

export function RankingBarChart({ data, selectedIndex, onSelectItem }: RankingBarChartProps) {
  // Validación de datos
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">
        No hay datos disponibles para mostrar
      </div>
    );
  }

  // Ordenar datos de mayor a menor por count (asegurar orden correcto)
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Crear mapeo de índices: índice en sortedData -> índice original en data
  const indexMap = sortedData.map((sortedItem) =>
    data.findIndex((originalItem) => originalItem.key === sortedItem.key)
  );

  // Mapear selectedIndex original al índice en sortedData
  const sortedSelectedIndex = selectedIndex !== null
    ? indexMap.findIndex((originalIdx) => originalIdx === selectedIndex)
    : null;

  const chartData = sortedData.map((item, index) => {
    const avgRating = item.data.movies.length > 0
      ? item.data.movies.reduce((sum, m) => sum + (m.user_rating || 0), 0) / item.data.movies.length
      : 0;

    return {
      name: truncateName(item.key, 12),
      fullName: item.key,
      count: item.count,
      avgRating: avgRating.toFixed(1),
      index,
      originalIndex: indexMap[index], // Guardar índice original para el click
    };
  });

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="h-[400px] w-full" style={{ minHeight: '400px' }}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
        >
          <XAxis type="number" tickLine={false} axisLine={false} hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={120}
            interval={0}
            tick={{ fontSize: 11, fill: 'currentColor' }}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(clickedData: any) => {
              const payload = clickedData.payload || clickedData;
              const clickedItem = chartData.find((item) => item.name === payload.name || item.fullName === payload.fullName);
              if (clickedItem && clickedItem.originalIndex !== undefined) {
                onSelectItem(clickedItem.originalIndex);
              }
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
                opacity={sortedSelectedIndex === null || sortedSelectedIndex === index ? 1 : 0.4}
                stroke={sortedSelectedIndex === index ? "currentColor" : "transparent"}
                strokeWidth={sortedSelectedIndex === index ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + "…";
}
