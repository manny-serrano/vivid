import { usePlaidLink } from 'react-plaid-link';
import { useLinkToken, useExchangeToken } from '../../hooks/usePlaid';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Landmark } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const { data: linkData, isLoading } = useLinkToken();
  const exchange = useExchangeToken();

  const { open, ready } = usePlaidLink({
    token: linkData?.linkToken ?? null,
    onSuccess: (publicToken) => {
      exchange.mutate(publicToken, {
        onSuccess: () => onSuccess?.(),
      });
    },
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-3">
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
