import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Check, Copy } from 'lucide-react';

interface TwinShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl?: string;
}

export function TwinShareModal({ isOpen, onClose, shareUrl }: TwinShareModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share your Financial Twin">
      {shareUrl && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Anyone with this link can view the dimensions you've permitted.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-bg-elevated border border-slate-700 rounded-xl px-4 py-3 text-sm truncate"
            />
            <button
              onClick={copy}
              className="shrink-0 rounded-xl bg-bg-elevated border border-slate-700 p-3 hover:border-slate-500 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-text-secondary" />}
            </button>
          </div>
          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      )}
    </Modal>
  );
}
