import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { wrappedService, type WrappedCard } from '../services/wrappedService';
import {
  Sparkles, TrendingUp, Trophy, DollarSign, Store, Repeat,
  Zap, Target, ShieldCheck, ArrowUpRight, Brain, ChevronLeft,
  ChevronRight, Share2, X,
} from 'lucide-react';

const ICON_MAP: Record<string, typeof Sparkles> = {
  'sparkles': Sparkles, 'trending-up': TrendingUp, 'trophy': Trophy,
  'dollar-sign': DollarSign, 'store': Store, 'repeat': Repeat,
  'zap': Zap, 'target': Target, 'shield-check': ShieldCheck,
  'arrow-up-right': ArrowUpRight, 'brain': Brain,
};

function CountUp({ end, duration = 2000, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * end));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration]);

  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-3 pt-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: i < current ? '100%' : '0%' }}
            animate={{ width: i < current ? '100%' : i === current ? '100%' : '0%' }}
            transition={i === current ? { duration: 8, ease: 'linear' } : { duration: 0.2 }}
          />
        </div>
      ))}
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/20"
          initial={{
            x: Math.random() * 600,
            y: Math.random() * 900,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, -100],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="white" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-black text-white">
          <CountUp end={score} duration={2000} />
        </span>
      </div>
    </div>
  );
}

function CardContent({ card, isActive }: { card: WrappedCard; isActive: boolean }) {
  const Icon = ICON_MAP[card.icon] ?? Sparkles;

  if (card.type === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <motion.div
          initial={{ scale: 0 }} animate={isActive ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
        >
          <Sparkles className="h-16 w-16 text-white/90 mb-6" />
        </motion.div>
        <motion.h1
          className="text-4xl font-black text-white mb-3 leading-tight"
          initial={{ opacity: 0, y: 30 }} animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {card.title}
        </motion.h1>
        <motion.p
          className="text-lg text-white/70 mb-8"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          {card.subtitle}
        </motion.p>
        <motion.div
          className="text-6xl font-black text-white mb-2"
          initial={{ opacity: 0, scale: 0.5 }} animate={isActive ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 1.1, type: 'spring' }}
        >
          <CountUp end={parseInt(card.stat ?? '0', 10) || 0} />
        </motion.div>
        <motion.p
          className="text-sm text-white/60 uppercase tracking-widest"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1.4 }}
        >
          {card.statLabel}
        </motion.p>
        <motion.p
          className="text-base text-white/80 mt-8 max-w-sm leading-relaxed"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1.7 }}
        >
          {card.narrative}
        </motion.p>
      </div>
    );
  }

  if (card.type === 'finale') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <motion.div
          initial={{ scale: 0 }} animate={isActive ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
        >
          <ScoreRing score={parseInt(card.stat ?? '0', 10) || 0} size={180} />
        </motion.div>
        <motion.p
          className="text-sm text-white/60 uppercase tracking-widest mt-4 mb-2"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1 }}
        >
          {card.statLabel}
        </motion.p>
        <motion.p
          className="text-lg text-white/80 max-w-sm leading-relaxed mt-4"
          initial={{ opacity: 0, y: 20 }} animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.3 }}
        >
          {card.narrative}
        </motion.p>
        {card.items && (
          <motion.div
            className="mt-6 space-y-2 w-full max-w-xs"
            initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 1.6 }}
          >
            {card.items.map((item, i) => (
              <motion.div
                key={i}
                className="flex justify-between text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={isActive ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 1.8 + i * 0.1 }}
              >
                <span className="text-white/60">{item.label}</span>
                <span className={`font-bold ${item.color ?? 'text-white'}`}>{item.value}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // Default card layout
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }} animate={isActive ? { scale: 1, rotate: 0 } : {}}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
      >
        <Icon className="h-12 w-12 text-white/80 mb-6" />
      </motion.div>

      <motion.h2
        className="text-2xl font-black text-white mb-2"
        initial={{ opacity: 0, y: 20 }} animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4 }}
      >
        {card.title}
      </motion.h2>

      {card.stat && (
        <motion.div
          className="mt-4 mb-1"
          initial={{ opacity: 0, scale: 0.5 }} animate={isActive ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.6, type: 'spring' }}
        >
          <span className="text-5xl font-black text-white">
            {card.stat.startsWith('$') || card.stat.startsWith('+') || card.stat.startsWith('-')
              ? card.stat
              : <CountUp end={parseInt(card.stat, 10) || 0} />}
          </span>
        </motion.div>
      )}

      {card.statLabel && (
        <motion.p
          className="text-xs text-white/50 uppercase tracking-widest mb-3"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          {card.statLabel}
        </motion.p>
      )}

      {card.secondaryStat && (
        <motion.div
          className="flex items-center gap-2 mb-4"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 0.9 }}
        >
          <span className="text-2xl font-bold text-white/90">{card.secondaryStat}</span>
          <span className="text-xs text-white/50 uppercase">{card.secondaryLabel}</span>
        </motion.div>
      )}

      <motion.p
        className="text-base text-white/75 max-w-sm leading-relaxed mt-2"
        initial={{ opacity: 0, y: 10 }} animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.1 }}
      >
        {card.narrative}
      </motion.p>

      {card.items && card.items.length > 0 && (
        <motion.div
          className="mt-6 space-y-2.5 w-full max-w-xs"
          initial={{ opacity: 0 }} animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1.3 }}
        >
          {card.items.map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/10 backdrop-blur px-3 py-2"
              initial={{ opacity: 0, x: -20 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 1.5 + i * 0.08 }}
            >
              <span className="text-sm text-white/70 truncate mr-2 capitalize">{item.label}</span>
              <span className={`text-sm font-bold whitespace-nowrap ${item.color ?? 'text-white'}`}>{item.value}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading screen
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 flex flex-col items-center justify-center">
      <FloatingParticles />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="h-16 w-16 text-white/80" />
      </motion.div>
      <motion.p
        className="text-white/80 text-lg mt-6 font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Generating your Wrapped...
      </motion.p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function WrappedPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vivid-wrapped'],
    queryFn: wrappedService.getWrapped,
  });

  const cards = data?.cards ?? [];
  const total = cards.length;

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!autoplay || total === 0) return;
    if (current >= total - 1) { setAutoplay(false); return; }
    timerRef.current = setTimeout(goNext, 8000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, autoplay, total, goNext]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setAutoplay(false); goNext(); }
      if (e.key === 'ArrowLeft') { setAutoplay(false); goPrev(); }
      if (e.key === 'Escape') navigate('/dashboard');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, navigate]);

  if (isLoading) return <LoadingScreen />;

  if (error || !data || cards.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <Sparkles className="h-12 w-12 text-white/40 mb-4" />
        <p className="text-white/60 text-lg">Could not generate your Wrapped.</p>
        <p className="text-white/40 text-sm mt-1">Make sure your Financial Twin exists.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 text-sm text-white/60 hover:text-white underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const card = cards[current];

  function handleClick(e: React.MouseEvent) {
    setAutoplay(false);
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.3) goPrev();
    else goNext();
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `My ${data.year} Vivid Wrapped`,
        text: `My Vivid Score is ${cards.find((c) => c.type === 'finale')?.stat ?? '??'}. Check out my financial year in review!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] cursor-pointer select-none overflow-hidden"
      onClick={handleClick}
    >
      <ProgressBar current={current} total={total} />

      {/* Close / Share buttons */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {current === total - 1 && (
          <button
            onClick={handleShare}
            className="rounded-full bg-white/20 backdrop-blur p-2 hover:bg-white/30 transition-colors"
          >
            <Share2 className="h-5 w-5 text-white" />
          </button>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-full bg-white/20 backdrop-blur p-2 hover:bg-white/30 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Nav arrows */}
      <div className="absolute inset-y-0 left-0 w-16 z-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {current > 0 && (
          <button onClick={goPrev} className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20">
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
      </div>
      <div className="absolute inset-y-0 right-0 w-16 z-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {current < total - 1 && (
          <button onClick={goNext} className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20">
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Card slide number */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/30 text-xs font-mono">
        {current + 1} / {total}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          className={`absolute inset-0 bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <FloatingParticles />
          <div className="relative z-10 w-full max-w-lg mx-auto h-full flex items-center justify-center py-16">
            <CardContent card={card} isActive={true} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
