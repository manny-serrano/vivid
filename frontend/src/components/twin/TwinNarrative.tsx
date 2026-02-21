import { motion } from 'framer-motion';
import { Card } from '../ui/Card';

interface TwinNarrativeProps {
  narrative: string;
}

export function TwinNarrative({ narrative }: TwinNarrativeProps) {
  const paragraphs = narrative.split('\n').filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <h3 className="text-lg font-semibold">AI Financial Narrative</h3>
        </div>
        <div className="space-y-3">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-base leading-relaxed text-text-secondary">
              {p}
            </p>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
