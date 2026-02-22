import { useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useLinkToken, useExchangeToken } from '../../hooks/usePlaid';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Landmark } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: linkData, isLoading, error: linkError } = useLinkToken();
  const exchange = useExchangeToken();

  const { open, ready } = usePlaidLink({
    token: linkData?.linkToken ?? null,
    onSuccess: (publicToken) => {
      setErrorMessage(null);
      exchange.mutate(publicToken, {
        onSuccess: () => onSuccess?.(),
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err.response?.data?.message ?? err.message ?? 'Failed to connect account and build twin.';
          setErrorMessage(String(msg));
        },
      });
    },
  });

  const displayError = errorMessage ?? linkError?.message ?? (exchange.error as Error)?.message;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-3">
      {displayError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3">
          {displayError}
        </div>
      )}
      <Button
        onClick={() => open()}
        disabled={!ready || exchange.isPending}
        className="w-full flex items-center justify-center gap-2"
      >
        <Landmark className="h-5 w-5" />
        {exchange.isPending ? 'Connecting...' : 'Connect with Plaid'}
      </Button>
      <p className="text-xs text-text-secondary text-center">
        Your credentials are encrypted end-to-end and never stored by Vivid.
      </p>
    </div>
  );
}
