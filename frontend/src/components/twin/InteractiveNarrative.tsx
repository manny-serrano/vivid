import { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { fetchCategoryDrilldown } from '../../services/twinService';
import type { CategoryDrilldown } from '../../services/twinService';
import { Sparkles, ExternalLink, ArrowRight } from 'lucide-react';

interface InteractiveNarrativeProps {
  narrative: string;
  categories: { category: string; total: number; count: number }[];
}

interface NarrativeSegment {
  text: string;
  isClickable: boolean;
  category?: string;
  categoryLabel?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent / Housing',
  groceries: 'Groceries',
  utilities: 'Utilities',
  insurance: 'Insurance',
  medical: 'Medical',
  dining: 'Dining Out',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  subscriptions: 'Subscriptions',
  transportation: 'Transportation',
  debt_payment: 'Debt Payments',
  savings_transfer: 'Savings',
  other: 'Other',
  income: 'Income',
  investment: 'Investment',
};

const KEYWORD_TO_CATEGORY: [RegExp, string][] = [
  [/\b(discretionary)\s*(spending|categories|expenses?)\b/gi, '_discretionary'],
  [/\b(essential)\s*(spending|expenses?|costs?)\b/gi, '_essential'],
  [/\b(recurring)\s*(charges?|subscriptions?|payments?)\b/gi, 'subscriptions'],
  [/\bsubscription(s?)\b/gi, 'subscriptions'],
  [/\b(rent|housing)\b/gi, 'rent'],
  [/\bgroceri(es|y)\b/gi, 'groceries'],
  [/\b(dining|restaurants?|eating out)\b/gi, 'dining'],
  [/\bentertainment\b/gi, 'entertainment'],
  [/\bshopping\b/gi, 'shopping'],
  [/\butiliti(es|y)\b/gi, 'utilities'],
  [/\b(transport|transportation|gas|fuel)\b/gi, 'transportation'],
  [/\binsurance\b/gi, 'insurance'],
  [/\b(medical|healthcare|health)\b/gi, 'medical'],
  [/\b(debt|loan)\s*(payment|repayment|trajectory)s?\b/gi, 'debt_payment'],
  [/\b(saving|savings)\b/gi, 'savings_transfer'],
  [/\binvest(ment|ing|s)\b/gi, 'investment'],
  [/\bincome\b/gi, 'income'],
  [/\b(spending discipline|spending habits?)\b/gi, '_spending'],
  [/\b(spend(ing)?)\b/gi, '_spending'],
];

const SCORE_KEYWORDS: RegExp[] = [
  /\b(income stability|spending discipline|debt trajectory|financial resilience|growth momentum)\b/gi,
  /\b(vivid score|overall score)\b/gi,
  /\b\d{1,3}\s*\/\s*100\b/g,
  /\b\d{1,3}\s*out of\s*100\b/gi,
];

function parseNarrative(
  text: string,
  availableCategories: Set<string>,
): NarrativeSegment[] {
  const segments: NarrativeSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; category: string; label: string } | null = null;

    for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
      pattern.lastIndex = 0;
      const match = pattern.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        const cat = category.startsWith('_') ? category : category;
        const isRealCategory = !category.startsWith('_') && availableCategories.has(category);
        const isMetaCategory = category.startsWith('_');
        if (isRealCategory || isMetaCategory) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            category: cat,
            label: match[0],
          };
        }
      }
    }

    for (const pattern of SCORE_KEYWORDS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = {
          index: match.index,
          length: match[0].length,
          category: '_score',
          label: match[0],
        };
      }
    }

    if (!earliestMatch) {
      segments.push({ text: remaining, isClickable: false });
      break;
    }

    if (earliestMatch.index > 0) {
      segments.push({ text: remaining.slice(0, earliestMatch.index), isClickable: false });
    }

    const matchedText = remaining.slice(earliestMatch.index, earliestMatch.index + earliestMatch.length);
    const isClickableCategory = !earliestMatch.category.startsWith('_');

    segments.push({
      text: matchedText,
      isClickable: isClickableCategory,
      category: isClickableCategory ? earliestMatch.category : undefined,
      categoryLabel: isClickableCategory
        ? CATEGORY_LABELS[earliestMatch.category] ?? earliestMatch.category
        : undefined,
    });

    remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
  }

  return segments;
}

export function InteractiveNarrative({ narrative, categories }: InteractiveNarrativeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const availableCategories = useMemo(() => new Set(categories.map((c) => c.category)), [categories]);

  const { data: drilldown, isLoading: drilldownLoading } = useQuery({
    queryKey: ['category-drilldown', selectedCategory],
    queryFn: () => fetchCategoryDrilldown(selectedCategory!),
    enabled: !!selectedCategory,
  });

  const paragraphs = narrative.split('\n').filter(Boolean);

  const parsedParagraphs = useMemo(
    () => paragraphs.map((p) => parseNarrative(p, availableCategories)),
    [paragraphs, availableCategories],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <h3 className="text-lg font-semibold">AI Financial Narrative</h3>
            <span className="text-xs text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-md ml-auto flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Interactive — click highlighted text to explore
            </span>
          </div>
          <div className="space-y-3">
            {parsedParagraphs.map((segments, pIdx) => (
              <p key={pIdx} className="text-base leading-relaxed text-text-secondary">
                {segments.map((seg, sIdx) =>
                  seg.isClickable ? (
                    <button
                      key={sIdx}
                      onClick={() => setSelectedCategory(seg.category!)}
                      className="inline text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary hover:text-primary/80 transition-colors cursor-pointer font-medium"
                      title={`Click to see ${seg.categoryLabel} transactions`}
                    >
                      {seg.text}
                    </button>
                  ) : (
                    <Fragment key={sIdx}>{seg.text}</Fragment>
                  ),
                )}
              </p>
            ))}
          </div>

          {/* Category quick links */}
          {categories.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-text-secondary mb-2">Explore spending categories:</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 8).map((c) => (
                  <button
                    key={c.category}
                    onClick={() => setSelectedCategory(c.category)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-slate-700 text-text-secondary hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {CATEGORY_LABELS[c.category] ?? c.category}
                    <span className="text-[10px] opacity-60">${c.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Drilldown Modal */}
      <Modal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={`${CATEGORY_LABELS[selectedCategory ?? ''] ?? selectedCategory ?? ''} Transactions`}
      >
        {drilldownLoading ? (
          <p className="text-text-secondary text-sm py-4 text-center">Loading transactions...</p>
        ) : drilldown ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{drilldown.count} transactions</span>
              <span className="font-bold text-lg">${drilldown.total.toLocaleString()}</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {drilldown.transactions.slice(0, 50).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-bg-elevated text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.merchantName ?? 'Unknown'}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(t.date).toLocaleDateString()}
                      {t.isRecurring && ' · Recurring'}
                    </p>
                  </div>
                  <span className={`font-semibold ml-3 ${t.isIncomeDeposit ? 'text-success' : ''}`}>
                    {t.isIncomeDeposit ? '+' : '-'}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {drilldown.transactions.length > 50 && (
                <p className="text-xs text-text-secondary text-center py-2">
                  Showing 50 of {drilldown.count} transactions
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-text-secondary text-sm">No data available.</p>
        )}
      </Modal>
    </>
  );
}
