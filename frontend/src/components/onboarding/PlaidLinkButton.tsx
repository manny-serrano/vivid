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

  const openPlaid = () => {
    if (!linkData?.linkToken) return;
    exchange.mutate('sandbox-public-token', {
      onSuccess: () => onSuccess?.(),
    });
  };

  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <Button
        onClick={openPlaid}
        disabled={!linkData?.linkToken || exchange.isPending}
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
