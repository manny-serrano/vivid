import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileSetup } from './ProfileSetup';
import { PlaidLinkButton } from './PlaidLinkButton';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

type Step = 'profile' | 'plaid' | 'building';

export function OnboardingFlow() {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>(user ? 'plaid' : 'profile');
  const navigate = useNavigate();

  const handlePlaidSuccess = () => {
    setStep('building');
    setTimeout(() => navigate('/dashboard'), 4000);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['profile', 'plaid', 'building'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-primary text-white'
                  : i < ['profile', 'plaid', 'building'].indexOf(step)
                    ? 'bg-success text-white'
                    : 'bg-bg-elevated text-text-secondary'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="h-px w-8 bg-slate-700" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ProfileSetup onNext={() => setStep('plaid')} />
            <p className="text-sm text-text-secondary text-center mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </motion.div>
        )}

        {step === 'plaid' && (
          <motion.div key="plaid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <h2 className="text-xl font-semibold mb-2">Connect your bank</h2>
              <p className="text-text-secondary text-sm mb-6">
                Securely link your bank account via Plaid. We analyze up to 24 months
                of transactions to build your Financial Twin.
              </p>
              <PlaidLinkButton onSuccess={handlePlaidSuccess} />
            </Card>
          </motion.div>
        )}

        {step === 'building' && (
          <motion.div key="building" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="text-center py-12">
              <Spinner className="mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-2">Building your Financial Twin</h2>
              <p className="text-text-secondary text-sm max-w-xs mx-auto">
                Analyzing transactions, scoring dimensions, generating narrative, and stamping
                on Hedera blockchain...
              </p>
              <div className="flex justify-center gap-2 mt-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
