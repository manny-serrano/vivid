import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { RADAR_COLORS } from '../../utils/chartHelpers';
import { Card } from '../ui/Card';

interface Dimension {
  key: string;
  label: string;
  score: number;
}

interface TwinRadarChartProps {
  dimensions: Dimension[];
}

export function TwinRadarChart({ dimensions }: TwinRadarChartProps) {
  const data = dimensions.map((d) => ({
    subject: d.label,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Card>
        <h3 className="text-lg font-semibold mb-4">Dimension breakdown</h3>
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
              />
              <Radar
                name="Score"
                dataKey="score"
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

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {dimensions.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: RADAR_COLORS[d.key] ?? '#94A3B8' }}
              />
              <span className="text-xs text-text-secondary truncate">{d.label}</span>
              <span className="text-xs font-semibold ml-auto">{Math.round(d.score)}</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
