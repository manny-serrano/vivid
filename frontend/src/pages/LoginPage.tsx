import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setIdToken = useAuthStore((s) => s.setIdToken);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const token = await credential.user.getIdToken();
      setIdToken(token);

      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = res.data.user;
      setUser(user);

      navigate(user.hasTwin ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err?.message ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title="Welcome back">
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <h2 className="text-xl font-semibold mb-2">Log in to Vivid</h2>
          <p className="text-text-secondary text-sm mb-6">
            Access your Financial Digital Twin.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                placeholder="you@email.com"
              />
              {errors.email && <p className="text-sm text-danger mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                placeholder="Your password"
              />
              {errors.password && <p className="text-sm text-danger mt-1">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
          <p className="text-sm text-text-secondary text-center mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/onboarding" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
}
