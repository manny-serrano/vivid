import { useCallback, useEffect, useRef, useState } from 'react';

type VoiceGender = 'nova' | 'atlas';

function pickVoice(voices: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | null {
  const femaleHints = ['female', 'woman', 'zira', 'samantha', 'karen', 'victoria', 'susan', 'hazel', 'jenny', 'aria', 'nova'];
  const maleHints = ['male', 'man', 'david', 'james', 'daniel', 'mark', 'guy', 'thomas', 'roger', 'atlas'];

  const hints = gender === 'nova' ? femaleHints : maleHints;
  const enVoices = voices.filter((v) => v.lang.startsWith('en'));

  for (const hint of hints) {
    const match = enVoices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }

  if (enVoices.length >= 2) {
    return gender === 'nova' ? enVoices[1] : enVoices[0];
  }

  return enVoices[0] ?? voices[0] ?? null;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback(
    (text: string, gender: VoiceGender) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(voices, gender);
      if (voice) utterance.voice = voice;

      utterance.rate = 1.0;
      utterance.pitch = gender === 'nova' ? 1.15 : 0.9;
      utterance.volume = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voices],
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, available: typeof window !== 'undefined' && !!window.speechSynthesis };
}
