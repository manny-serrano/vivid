import { PageWrapper } from '../components/layout/PageWrapper';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';

export function OnboardingPage() {
  return (
    <PageWrapper title="Set up your Financial Twin">
      <OnboardingFlow />
    </PageWrapper>
  );
}
