import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { RADAR_COLORS } from '../../utils/chartHelpers';
import { Card } from '../ui/Card';
import { Ghost, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Dimension {
  key: string;
  label: string;
  score: number;
}

interface GhostDimension {
  key: string;
  label: string;
  score: number;
}

interface TwinRadarChartProps {
  dimensions: Dimension[];
  ghostDimensions?: GhostDimension[];
  ghostLabel?: string;
}

export function TwinRadarChart({ dimensions, ghostDimensions, ghostLabel }: TwinRadarChartProps) {
  const [showGhost, setShowGhost] = useState(true);
  const hasGhost = ghostDimensions && ghostDimensions.length > 0;

  const ghostMap = new Map<string, number>();
  if (ghostDimensions) {
    for (const g of ghostDimensions) ghostMap.set(g.key, g.score);
  }

  const data = dimensions.map((d) => ({
    subject: d.label,
    current: d.score,
    previous: ghostMap.get(d.key) ?? null,
    fullMark: 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dimension breakdown</h3>
          {hasGhost && (
            <button
              onClick={() => setShowGhost(!showGhost)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                showGhost
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-bg-elevated border-slate-700 text-text-secondary hover:border-slate-500'
              }`}
            >
              <Ghost className="h-3.5 w-3.5" />
              {showGhost ? 'Hide' : 'Show'} {ghostLabel ?? 'Previous'}
            </button>
          )}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  fontSize: 13,
                }}
                labelStyle={{ color: '#F8FAFC' }}
                formatter={(value: number, name: string) => {
                  const label = name === 'previous' ? (ghostLabel ?? 'Previous') : 'Current';
                  return [Math.round(value), label];
                }}
              />

              {/* Ghost (previous) radar - rendered first so it's behind */}
              {hasGhost && showGhost && (
                <Radar
                  name="previous"
                  dataKey="previous"
                  stroke="#64748B"
                  fill="#64748B"
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  animationDuration={800}
                  dot={{ r: 3, fill: '#64748B', strokeWidth: 0 }}
                />
              )}

              {/* Current radar */}
              <Radar
                name="current"
                dataKey="current"
                stroke="#6B21A8"
                fill="url(#radarGradient)"
                fillOpacity={0.55}
                animationDuration={1200}
              />

              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6B21A8" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with delta indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {dimensions.map((d) => {
            const prev = ghostMap.get(d.key);
            const delta = prev != null ? d.score - prev : null;

            return (
              <div key={d.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: RADAR_COLORS[d.key] ?? '#94A3B8' }}
                />
                <span className="text-xs text-text-secondary truncate">{d.label}</span>
                <span className="text-xs font-semibold ml-auto flex items-center gap-0.5">
                  {Math.round(d.score)}
                  {delta != null && delta !== 0 && (
                    <span className={`flex items-center text-[10px] ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                      {delta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {delta > 0 ? '+' : ''}{Math.round(delta)}
                    </span>
                  )}
                  {delta != null && delta === 0 && (
                    <Minus className="h-2.5 w-2.5 text-text-secondary" />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {hasGhost && showGhost && (
          <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
            <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
            <span>{ghostLabel ?? 'Previous scores'}</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
