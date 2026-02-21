import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { scoreLabel, scoreColor } from '../../utils/scoreHelpers';

interface TwinScoreCardProps {
  score: number;
}

export function TwinScoreCard({ score }: TwinScoreCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = Math.round(score);
    if (target === 0) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-bg-surface border border-slate-700 p-8 text-center"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-2">
        Overall Vivid Score
      </p>
      <p className="text-6xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent leading-none">
        {displayed}
      </p>
      <p className={`text-lg font-semibold mt-3 ${scoreColor(score)}`}>
        {scoreLabel(score)}
      </p>
      <p className="text-sm text-text-secondary mt-1">out of 100</p>
    </motion.div>
  );
}
