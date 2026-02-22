import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { widgetService } from '../services/widgetService';
import type { WidgetPublicConfig } from '../services/widgetService';
import {
  ShieldCheck, CheckCircle2, XCircle, LogIn,
  Eye, Lock, ExternalLink, ChevronRight, Loader2,
} from 'lucide-react';

const SCOPE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  overall_score: { label: 'Overall Score', desc: 'Your Vivid score (0-100)' },
  score_tier: { label: 'Score Tier', desc: 'Rating tier (Excellent, Strong, etc.)' },
  dimension_scores: { label: 'Dimension Scores', desc: 'All five pillar scores' },
  lending_readiness: { label: 'Lending Readiness', desc: 'Loan approval likelihood per type' },
  narrative: { label: 'Narrative', desc: 'AI-generated financial summary' },
  blockchain_proof: { label: 'Blockchain Proof', desc: 'Hedera verification status and hash' },
  reputation_score: { label: 'Reputation', desc: 'Attestation-based trust score' },
};

type Step = 'loading' | 'login' | 'consent' | 'success' | 'denied' | 'error';

export function WidgetEmbedPage() {
  const [params] = useSearchParams();
  const widgetId = params.get('widgetId');
  const sessionToken = params.get('session');
  const idToken = useAuthStore((s) => s.idToken);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('loading');
  const [config, setConfig] = useState<WidgetPublicConfig | null>(null);
  const [token, setToken] = useState(sessionToken ?? '');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!widgetId) { setStep('error'); setError('Missing widget ID'); return; }

    (async () => {
      try {
        const cfg = await widgetService.getConfig(widgetId);
        setConfig(cfg);
        setSelectedScopes(new Set(cfg.scopes));

        if (!sessionToken) {
          const session = await widgetService.initiateSession(widgetId);
          setToken(session.sessionToken);
        }

        setStep(idToken ? 'consent' : 'login');
      } catch {
        setStep('error');
        setError('Widget not found or inactive');
      }
    })();
  }, [widgetId, sessionToken, idToken]);

  useEffect(() => {
    if (idToken && step === 'login') setStep('consent');
  }, [idToken, step]);

  const handleConsent = async () => {
    if (!token || selectedScopes.size === 0) return;
    setProcessing(true);
    try {
      await widgetService.consent(token, [...selectedScopes]);
      await widgetService.complete(token);
      setStep('success');

      window.parent?.postMessage({
        type: 'VIVID_WIDGET_COMPLETE',
        sessionToken: token,
        status: 'completed',
      }, '*');
    } catch {
      setError('Failed to process consent');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    setProcessing(true);
    try {
      if (token) await widgetService.deny(token);
      setStep('denied');

      window.parent?.postMessage({
        type: 'VIVID_WIDGET_DENIED',
        sessionToken: token,
        status: 'denied',
      }, '*');
    } catch {
      setStep('denied');
    } finally {
      setProcessing(false);
    }
  };

  const toggleScope = (scope: string) => {
    const next = new Set(selectedScopes);
    if (next.has(scope)) next.delete(scope);
    else next.add(scope);
    setSelectedScopes(next);
  };

  const brandColor = config?.brandColor ?? '#8b5cf6';

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: `${brandColor}20` }}
          >
            <ShieldCheck className="h-6 w-6" style={{ color: brandColor }} />
          </div>
          <h1 className="text-lg font-bold text-white">Verify with Vivid</h1>
          {config && (
            <p className="text-xs text-slate-400 mt-1">
              <span style={{ color: brandColor }} className="font-semibold">{config.partnerName}</span> wants to verify your financial profile
            </p>
          )}
        </div>

        <div className="bg-[#111127] border border-slate-700/50 rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Loading */}
            {step === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-400">Loading widget...</p>
              </motion.div>
            )}

            {/* Login */}
            {step === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 text-center space-y-4">
                <LogIn className="h-8 w-8 mx-auto text-slate-400" />
                <p className="text-sm text-slate-300">Sign in to your Vivid account to continue</p>
                <a
                  href={`/login?redirect=${encodeURIComponent(window.location.href)}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${brandColor}, #06b6d4)` }}
                >
                  <LogIn className="h-4 w-4" /> Sign In
                </a>
                <p className="text-[10px] text-slate-500">
                  Don't have an account? <a href="/login" className="underline">Create one free</a>
                </p>
              </motion.div>
            )}

            {/* Consent */}
            {step === 'consent' && config && (
              <motion.div key="consent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="px-5 py-4 border-b border-slate-700/30">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Lock className="h-3 w-3" />
                    <span>Secured connection · Your data stays private until you approve</span>
                  </div>
                </div>

                {/* User info */}
                {user && (
                  <div className="px-5 py-3 flex items-center gap-3 bg-slate-800/30">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.email}</p>
                      <p className="text-[10px] text-slate-400">Vivid Financial Twin</p>
                    </div>
                  </div>
                )}

                {/* Scopes */}
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-300 mb-3">
                    {config.partnerName} is requesting access to:
                  </p>
                  {config.scopes.map((scope) => {
                    const info = SCOPE_DESCRIPTIONS[scope];
                    if (!info) return null;
                    const checked = selectedScopes.has(scope);
                    return (
                      <button
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          checked
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-slate-700/40 bg-transparent hover:border-slate-600'
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'border-primary bg-primary' : 'border-slate-600'
                        }`}>
                          {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{info.label}</p>
                          <p className="text-[10px] text-slate-400">{info.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-slate-700/30 space-y-2">
                  <button
                    onClick={handleConsent}
                    disabled={processing || selectedScopes.size === 0}
                    className="w-full py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-30 flex items-center justify-center gap-2 transition-all"
                    style={{ background: `linear-gradient(135deg, ${brandColor}, #06b6d4)` }}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Approve & Share
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDeny}
                    disabled={processing}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Deny Access
                  </button>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <h3 className="text-lg font-bold text-white">Verified!</h3>
                <p className="text-sm text-slate-400">
                  Your Vivid profile has been shared with <span className="text-white font-medium">{config?.partnerName}</span>.
                </p>
                <p className="text-[10px] text-slate-500">You can revoke access at any time from your Vivid dashboard.</p>
              </motion.div>
            )}

            {/* Denied */}
            {step === 'denied' && (
              <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center space-y-3">
                <XCircle className="h-10 w-10 mx-auto text-slate-500" />
                <p className="text-sm text-slate-400">Access denied. No data was shared.</p>
              </motion.div>
            )}

            {/* Error */}
            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center space-y-3">
                <XCircle className="h-10 w-10 mx-auto text-danger" />
                <p className="text-sm text-danger">{error || 'Something went wrong'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <a href="/" className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors flex items-center justify-center gap-1">
            Powered by Vivid <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
