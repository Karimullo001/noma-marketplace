"use client";

import React from "react";

export interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  title: string;
  subtitle?: string;
  data: LineChartPoint[];
  color?: string;
  valueFormatter?: (val: number) => string;
}

export function SimpleLineChart({
  title,
  subtitle,
  data,
  color = "#7C3AED",
  valueFormatter = (v) => String(v),
}: LineChartProps) {
  const safeData = data.length > 0 ? data : [{ label: "-", value: 0 }];
  const width = 320;
  const height = 130;
  const padX = 16;
  const padTop = 16;
  const padBottom = 24;

  const maxVal = Math.max(...safeData.map((d) => d.value), 1);
  const minVal = 0;
  const range = Math.max(maxVal - minVal, 1);

  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const points = safeData.map((d, i) => {
    const x = safeData.length === 1 ? padX + innerW / 2 : padX + (i / (safeData.length - 1)) * innerW;
    const y = padTop + innerH - ((d.value - minVal) / range) * innerH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : "";

  const latest = safeData[safeData.length - 1]?.value ?? 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-border shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-black text-primary">{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-zinc-100 text-primary">
          {valueFormatter(latest)}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        {/* Horizontal guide lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = padTop + innerH * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="#E4E4E7"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill={color} fillOpacity="0.12" />
        )}

        {/* Line */}
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots + X labels */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#71717A"
              fontWeight="600"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
