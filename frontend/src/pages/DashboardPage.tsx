import { useTwin } from '../hooks/useTwin';
import { PageWrapper } from '../components/layout/PageWrapper';
import { TwinDashboard } from '../components/twin/TwinDashboard';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export function DashboardPage() {
  const { data: twin, isLoading, error } = useTwin();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-text-secondary text-sm">{t('dashboard.loadingTwin')}</p>
      </div>
    );
  }

  if (error || !twin) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto mt-16">
          <Card className="text-center">
            <Rocket className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('dashboard.noTwin')}</h2>
            <p className="text-text-secondary text-sm mb-6">
              {t('dashboard.noTwinDesc')}
            </p>
            <Link to="/onboarding">
              <Button className="w-full">{t('dashboard.getStarted')}</Button>
            </Link>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('dashboard.title')}>
      <TwinDashboard twin={twin} />
    </PageWrapper>
  );
}
