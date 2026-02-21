import { useTwin } from '../hooks/useTwin';
import { PageWrapper } from '../components/layout/PageWrapper';
import { TwinDashboard } from '../components/twin/TwinDashboard';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';

export function DashboardPage() {
  const { data: twin, isLoading, error } = useTwin();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">Loading your Financial Twin...</p>
      </div>
    );
  }

  if (error || !twin) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto mt-16">
          <Card className="text-center">
            <Rocket className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No twin yet</h2>
            <p className="text-text-secondary text-sm mb-6">
              Connect your bank account to build your Financial Twin and unlock multi-dimensional insights.
            </p>
            <Link to="/onboarding">
              <Button className="w-full">Get started</Button>
            </Link>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Your Financial Twin">
      <TwinDashboard twin={twin} />
    </PageWrapper>
  );
}
