import { useTwin } from '../hooks/useTwin';
import { PageWrapper } from '../components/layout/PageWrapper';
import { TwinDashboard } from '../components/twin/TwinDashboard';
import { Spinner } from '../components/ui/Spinner';

export function TwinProfilePage() {
  const { data: twin, isLoading } = useTwin();

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (!twin) return <PageWrapper title="Twin"><p className="text-text-secondary">No twin data.</p></PageWrapper>;

  return (
    <PageWrapper title="My Financial Twin">
      <TwinDashboard twin={twin} />
    </PageWrapper>
  );
}
