import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

interface ProfileSetupProps {
  onNext: () => void;
}

export function ProfileSetup({ onNext }: ProfileSetupProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setIdToken = useAuthStore((s) => s.setIdToken);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        } else {
          throw err;
        }
      }

      const firebaseToken = await userCredential.user.getIdToken();
      setIdToken(firebaseToken);

      const res = await api.post('/auth/register', {
        firebaseToken,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      setUser(res.data.user);
      onNext();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-2">Your profile</h2>
      <p className="text-text-secondary text-sm mb-6">
        Tell us a bit about yourself to get started.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">First name</label>
          <input
            {...register('firstName')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="Marcus"
          />
          {errors.firstName && <p className="text-sm text-danger mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Last name</label>
          <input
            {...register('lastName')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="Johnson"
          />
          {errors.lastName && <p className="text-sm text-danger mt-1">{errors.lastName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="marcus@email.com"
          />
          {errors.email && <p className="text-sm text-danger mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
          <input
            {...register('password')}
            type="password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="At least 6 characters"
          />
          {errors.password && <p className="text-sm text-danger mt-1">{errors.password.message}</p>}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Continue'}
        </Button>
      </form>
    </Card>
  );
}
