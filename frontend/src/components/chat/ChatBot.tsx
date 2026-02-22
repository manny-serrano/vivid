import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Volume2, VolumeX } from 'lucide-react';
import { sendChatMessage } from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';
import { useSpeech } from '../../hooks/useSpeech';
import { VoiceSelector } from './VoiceSelector';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hey! I'm your Vivid financial assistant. Pick a voice above — Nova or Atlas — and ask me anything about your finances!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState<'nova' | 'atlas'>('nova');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const idToken = useAuthStore((s) => s.idToken);
  const { speak, stop, speaking, available: ttsAvailable } = useSpeech();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendChatMessage(text, history);
      const botMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: response };
      setMessages((prev) => [...prev, botMsg]);

      if (autoSpeak && ttsAvailable) {
        speak(response, voice);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I couldn't process that right now. Try again in a moment!" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, autoSpeak, ttsAvailable, speak, voice]);

  const handleSpeakMessage = (content: string) => {
    if (speaking) {
      stop();
    } else {
      speak(content, voice);
    }
  };

  if (!idToken) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[540px] rounded-2xl border border-slate-700/60 bg-bg-base/95 backdrop-blur-xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                  V
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Vivid Assistant</p>
                  <p className="text-xs text-text-secondary">
                    {voice === 'nova' ? 'Nova' : 'Atlas'} · {speaking ? 'Speaking...' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ttsAvailable && (
                  <button
                    onClick={() => { setAutoSpeak(!autoSpeak); if (speaking) stop(); }}
                    className={`p-1.5 rounded-lg transition-colors ${autoSpeak ? 'text-cyan-400 hover:bg-cyan-400/10' : 'text-slate-500 hover:bg-slate-700'}`}
                    title={autoSpeak ? 'Voice on' : 'Voice off'}
                  >
                    {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); stop(); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-text-primary hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Voice selector */}
            <div className="flex justify-center py-2 border-b border-slate-700/40">
              <VoiceSelector voice={voice} onSelect={setVoice} />
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary/80 text-white rounded-br-md'
                        : 'bg-slate-800 text-text-primary rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                    {msg.role === 'assistant' && msg.id !== 'welcome' && ttsAvailable && (
                      <button
                        onClick={() => handleSpeakMessage(msg.content)}
                        className="ml-2 inline-flex text-slate-400 hover:text-cyan-400 transition-colors align-middle"
                        title="Read aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-2 w-2 rounded-full bg-slate-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-700/60 bg-slate-800/30">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your finances..."
                  className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white flex items-center justify-center disabled:opacity-30 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
