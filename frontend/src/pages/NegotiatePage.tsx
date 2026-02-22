import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import {
  negotiateService,
  type NegotiableBill,
  type GeneratedEmail,
} from '../services/negotiateService';
import {
  MessageSquareDashed, DollarSign, TrendingDown, Sparkles,
  Copy, Check, Send, RefreshCw, AlertTriangle, ChevronRight,
  Wand2, ArrowLeft, Mail,
} from 'lucide-react';

const CONFIDENCE_STYLES = {
  high: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', label: 'High Savings' },
  medium: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Moderate' },
  low: { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info', label: 'Worth Trying' },
};

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm but persuasive' },
  { value: 'firm', label: 'Firm', desc: 'Direct, willing to switch' },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function NegotiatePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['negotiate-bills'],
    queryFn: negotiateService.detectBills,
  });

  const [selectedBill, setSelectedBill] = useState<NegotiableBill | null>(null);
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [tone, setTone] = useState('professional');
  const [refineInput, setRefineInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateMutation = useMutation({
    mutationFn: (bill: NegotiableBill) =>
      negotiateService.generateEmail({
        merchantName: bill.merchantName,
        currentMonthly: bill.currentMonthly,
        estimatedFair: bill.estimatedFair,
        negotiationType: bill.negotiationType,
        tone,
      }),
    onSuccess: (result) => {
      setEmail(result);
      setEditedBody(result.body);
      setEditedSubject(result.subject);
      setIsEditing(false);
    },
  });

  const refineMutation = useMutation({
    mutationFn: (instruction: string) =>
      negotiateService.refineEmail({
        currentEmail: editedBody,
        instruction,
        merchantName: selectedBill!.merchantName,
        currentMonthly: selectedBill!.currentMonthly,
        estimatedFair: selectedBill!.estimatedFair,
      }),
    onSuccess: (result) => {
      setEmail(result);
      setEditedBody(result.body);
      setEditedSubject(result.subject);
      setRefineInput('');
    },
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editedBody]);

  function handleCopy() {
    const full = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelectBill(bill: NegotiableBill) {
    setSelectedBill(bill);
    setEmail(null);
    setEditedBody('');
    setEditedSubject('');
    setIsEditing(false);
    setRefineInput('');
  }

  function handleBack() {
    setSelectedBill(null);
    setEmail(null);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Scanning your bills for savings opportunities...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper title="Bill Negotiator">
        <Card className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text-secondary">
            Could not analyze your bills. Make sure your Financial Twin exists.
          </p>
        </Card>
      </PageWrapper>
    );
  }

  const bills = data.bills;
  const totalAnnualSavings = bills.reduce((s, b) => s + b.annualSavings, 0);

  if (selectedBill) {
    return (
      <PageWrapper title="Bill Negotiator">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all bills
          </button>

          {/* Bill summary header */}
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selectedBill.merchantName}</h2>
                <p className="text-text-secondary text-sm mt-1">{selectedBill.reason}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-danger">{formatCurrency(selectedBill.currentMonthly)}<span className="text-sm font-normal text-text-secondary">/mo</span></div>
                <div className="text-sm text-success">
                  Save {formatCurrency(selectedBill.potentialSavings)}/mo &middot; {formatCurrency(selectedBill.annualSavings)}/yr
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-danger to-success transition-all"
                  style={{ width: `${Math.min(100, (selectedBill.estimatedFair / selectedBill.currentMonthly) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary whitespace-nowrap">
                Fair: {formatCurrency(selectedBill.estimatedFair)}/mo
              </span>
            </div>
          </Card>

          {/* Tone + generate */}
          {!email && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Negotiation Email
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Choose a tone and we'll draft a personalized email you can send to {selectedBill.merchantName}.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      tone === t.value
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-700/50 bg-bg-elevated hover:border-primary/40'
                    }`}
                  >
                    <div className="text-sm font-semibold text-text-primary">{t.label}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => generateMutation.mutate(selectedBill)}
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner /> Generating...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Email view/edit */}
          <AnimatePresence>
            {email && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Your Negotiation Email
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? 'Preview' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateMutation.mutate(selectedBill)}
                        disabled={generateMutation.isPending}
                        title="Regenerate with a new draft"
                      >
                        <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {email.recipientHint && (
                    <div className="text-xs text-text-secondary mb-3">
                      <span className="font-medium">Suggested recipient:</span> {email.recipientHint}
                    </div>
                  )}

                  {/* Subject */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-text-secondary block mb-1">Subject</label>
                    {isEditing ? (
                      <input
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="w-full rounded-lg border border-slate-700/50 bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <div className="rounded-lg bg-bg-elevated px-3 py-2 text-sm text-text-primary font-medium">
                        {editedSubject}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-text-secondary block mb-1">Body</label>
                    {isEditing ? (
                      <textarea
                        ref={textareaRef}
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        className="w-full rounded-lg border border-slate-700/50 bg-bg-elevated px-4 py-3 text-sm text-text-primary leading-relaxed focus:border-primary focus:outline-none resize-none"
                        rows={12}
                      />
                    ) : (
                      <div className="rounded-lg bg-bg-elevated px-4 py-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {editedBody}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                      {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const mailto = `mailto:${email.recipientHint}?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
                        window.open(mailto);
                      }}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Open in Email Client
                    </Button>
                  </div>
                </Card>

                {/* AI Refine */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Refine with AI
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Tell the AI how you'd like to change the email. For example: "make it sound more firm",
                    "add that I've been a customer for 5 years", or "make it shorter and more professional".
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && refineInput.trim() && !refineMutation.isPending) {
                          refineMutation.mutate(refineInput.trim());
                        }
                      }}
                      placeholder="e.g. make this sound more professional..."
                      className="flex-1 rounded-lg border border-slate-700/50 bg-bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/50 focus:border-primary focus:outline-none"
                    />
                    <Button
                      onClick={() => refineMutation.mutate(refineInput.trim())}
                      disabled={!refineInput.trim() || refineMutation.isPending}
                    >
                      {refineMutation.isPending ? (
                        <Spinner />
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-1.5" />
                          Refine
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Quick refine suggestions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      'Make it more professional',
                      'Make it shorter',
                      'Sound more firm — I\'m ready to switch',
                      'Add that I\'ve been a loyal customer',
                      'Mention competitor pricing',
                      'Make it friendlier',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setRefineInput(suggestion);
                          refineMutation.mutate(suggestion);
                        }}
                        disabled={refineMutation.isPending}
                        className="rounded-full border border-slate-700/50 bg-bg-elevated px-3 py-1 text-xs text-text-secondary hover:border-primary/50 hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Bill Negotiator">
      {/* Hero stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 text-center">
          <MessageSquareDashed className="h-8 w-8 mx-auto text-primary mb-2" />
          <div className="text-3xl font-bold text-text-primary">{bills.length}</div>
          <div className="text-sm text-text-secondary">Negotiable Bills</div>
        </Card>
        <Card className="p-5 text-center">
          <TrendingDown className="h-8 w-8 mx-auto text-success mb-2" />
          <div className="text-3xl font-bold text-success">{formatCurrency(totalAnnualSavings)}</div>
          <div className="text-sm text-text-secondary">Potential Annual Savings</div>
        </Card>
        <Card className="p-5 text-center">
          <DollarSign className="h-8 w-8 mx-auto text-warning mb-2" />
          <div className="text-3xl font-bold text-warning">{formatCurrency(totalAnnualSavings / 12)}</div>
          <div className="text-sm text-text-secondary">Monthly Savings</div>
        </Card>
      </div>

      {bills.length === 0 ? (
        <Card className="p-12 text-center">
          <Check className="h-12 w-12 mx-auto text-success mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Your bills look great!</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            We didn't find any bills significantly above market rate. We'll keep monitoring and alert you if any opportunities come up.
          </p>
        </Card>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Bills You Could Be Paying Less For
          </h2>
          <div className="space-y-3">
            {bills.map((bill, i) => {
              const style = CONFIDENCE_STYLES[bill.confidence];
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`p-5 cursor-pointer border ${style.border} hover:border-primary/50 transition-all group`}
                    onClick={() => handleSelectBill(bill)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-text-primary">{bill.merchantName}</h3>
                          <Badge className={`${style.bg} ${style.text} text-xs`}>
                            {style.label}
                          </Badge>
                          <Badge className="bg-bg-elevated text-text-secondary text-xs capitalize">
                            {bill.category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">{bill.reason}</p>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-text-primary">
                            {formatCurrency(bill.currentMonthly)}<span className="text-xs font-normal text-text-secondary">/mo</span>
                          </div>
                          <div className="text-sm text-success font-medium">
                            Save {formatCurrency(bill.annualSavings)}/yr
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </PageWrapper>
  );
}
