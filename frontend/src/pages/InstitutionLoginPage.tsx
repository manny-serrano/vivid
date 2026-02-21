import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Building2 } from 'lucide-react';

export function InstitutionLoginPage() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <div className="max-w-md mx-auto mt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="text-center">
            <Building2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Institution portal</h1>
            <p className="text-text-secondary text-sm mb-6">
              Sign in to view applicant Financial Twins shared with your institution.
            </p>
            <Button onClick={() => navigate('/institution')} className="w-full">
              Continue as Sunrise Credit Union
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              Demo mode — no Firebase auth required
            </p>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
