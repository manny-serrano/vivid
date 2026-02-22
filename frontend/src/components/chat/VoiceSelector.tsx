interface VoiceSelectorProps {
  voice: 'nova' | 'atlas';
  onSelect: (voice: 'nova' | 'atlas') => void;
}

export function VoiceSelector({ voice, onSelect }: VoiceSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 rounded-full p-1">
      <button
        onClick={() => onSelect('nova')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          voice === 'nova'
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="text-sm">♀</span>
        Nova
      </button>
      <button
        onClick={() => onSelect('atlas')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          voice === 'atlas'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="text-sm">♂</span>
        Atlas
      </button>
    </div>
  );
}
